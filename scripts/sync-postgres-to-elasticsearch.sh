#!/bin/bash
# PostgreSQL'den Elasticsearch'e Veri Senkronizasyon Script'i
# Kararlar tablosundaki verileri Elasticsearch'e aktarır

set -e

# Konfigürasyon
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-yargitay_kararlari}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"

ELASTICSEARCH_URL="${ELASTICSEARCH_URL:-http://localhost:9200}"
INDEX_NAME="${INDEX_NAME:-kararlar}"
BATCH_SIZE="${BATCH_SIZE:-500}"

echo "============================================"
echo "PostgreSQL -> Elasticsearch Senkronizasyonu"
echo "============================================"
echo "PostgreSQL: $POSTGRES_HOST:$POSTGRES_PORT/$POSTGRES_DB"
echo "Elasticsearch: $ELASTICSEARCH_URL/$INDEX_NAME"
echo "Batch Size: $BATCH_SIZE"
echo ""

# Elasticsearch bağlantı kontrolü
echo "Elasticsearch bağlantısı kontrol ediliyor..."
if ! curl -s "$ELASTICSEARCH_URL/_cluster/health" > /dev/null 2>&1; then
    echo "HATA: Elasticsearch'e bağlanılamıyor!"
    exit 1
fi
echo "✓ Elasticsearch bağlantısı başarılı"
echo ""

# Toplam kayıt sayısını al
echo "PostgreSQL'den kayıt sayısı alınıyor..."
TOTAL_COUNT=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM kararlar;" | tr -d ' ')
echo "Toplam kayıt sayısı: $TOTAL_COUNT"
echo ""

if [ "$TOTAL_COUNT" -eq "0" ]; then
    echo "Aktarılacak kayıt bulunamadı!"
    exit 0
fi

# Index yoksa oluştur
if ! curl -s -o /dev/null -w "%{http_code}" "$ELASTICSEARCH_URL/$INDEX_NAME" | grep -q "200"; then
    echo "Index oluşturuluyor..."
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    curl -X PUT "$ELASTICSEARCH_URL/$INDEX_NAME" \
        -H "Content-Type: application/json" \
        -d @"$SCRIPT_DIR/elasticsearch_kararlar_mapping.json"
    echo ""
fi

# Batch halinde veri aktarımı
OFFSET=0
IMPORTED=0

echo "Veri aktarımı başlatılıyor..."
while [ $OFFSET -lt $TOTAL_COUNT ]; do
    echo "  İşleniyor: $OFFSET - $((OFFSET + BATCH_SIZE)) / $TOTAL_COUNT"
    
    # PostgreSQL'den veri çek ve Elasticsearch bulk formatına dönüştür
    PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $POSTGRES_DB -t -A -F '|' -c "
        SELECT 
            id,
            COALESCE(yargitay_dairesi, ''),
            COALESCE(esas_no, ''),
            COALESCE(karar_no, ''),
            COALESCE(TO_CHAR(karar_tarihi, 'YYYY-MM-DD'), ''),
            COALESCE(karar_metni, '')
        FROM kararlar 
        ORDER BY id 
        LIMIT $BATCH_SIZE OFFSET $OFFSET;
    " | while IFS='|' read -r id yargitay_dairesi esas_no karar_no karar_tarihi karar_metni; do
        # Boş değilse ekle
        if [ -n "$id" ]; then
            # JSON escape için özel karakterleri dönüştür
            karar_metni_escaped=$(echo "$karar_metni" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed 's/\n/\\n/g' | tr '\n' ' ')
            
            # Tarih boşsa null yap
            if [ -z "$karar_tarihi" ]; then
                karar_tarihi_json="null"
            else
                karar_tarihi_json="\"$karar_tarihi\""
            fi
            
            # Bulk API formatında çıktı
            echo "{\"index\":{\"_index\":\"$INDEX_NAME\",\"_id\":\"$id\"}}"
            echo "{\"id\":$id,\"yargitayDairesi\":\"$yargitay_dairesi\",\"esasNo\":\"$esas_no\",\"kararNo\":\"$karar_no\",\"kararTarihi\":$karar_tarihi_json,\"kararMetni\":\"$karar_metni_escaped\"}"
        fi
    done > /tmp/bulk_data.ndjson
    
    # Elasticsearch'e gönder
    if [ -s /tmp/bulk_data.ndjson ]; then
        RESPONSE=$(curl -s -X POST "$ELASTICSEARCH_URL/_bulk" \
            -H "Content-Type: application/x-ndjson" \
            --data-binary @/tmp/bulk_data.ndjson)
        
        ERRORS=$(echo "$RESPONSE" | grep -o '"errors":true' || true)
        if [ -n "$ERRORS" ]; then
            echo "  UYARI: Bazı kayıtlarda hata oluştu"
        fi
        
        BATCH_IMPORTED=$(wc -l < /tmp/bulk_data.ndjson)
        BATCH_IMPORTED=$((BATCH_IMPORTED / 2))
        IMPORTED=$((IMPORTED + BATCH_IMPORTED))
    fi
    
    OFFSET=$((OFFSET + BATCH_SIZE))
done

rm -f /tmp/bulk_data.ndjson

echo ""
echo "============================================"
echo "✓ Senkronizasyon tamamlandı!"
echo "  Toplam aktarılan: $IMPORTED kayıt"
echo "============================================"

# Index durumunu göster
echo ""
echo "Index Durumu:"
curl -s "$ELASTICSEARCH_URL/$INDEX_NAME/_count" | python3 -m json.tool 2>/dev/null || echo "(json formatlama mevcut değil)"

