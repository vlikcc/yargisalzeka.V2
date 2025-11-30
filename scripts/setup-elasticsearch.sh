#!/bin/bash
# Elasticsearch Kurulum ve Index Oluşturma Script'i
# Bu script Elasticsearch'ü başlatır ve kararlar index'ini oluşturur

set -e

ELASTICSEARCH_URL="${ELASTICSEARCH_URL:-http://localhost:9200}"
INDEX_NAME="${INDEX_NAME:-kararlar}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================"
echo "Elasticsearch Kurulum Script'i"
echo "============================================"
echo "Elasticsearch URL: $ELASTICSEARCH_URL"
echo "Index Adı: $INDEX_NAME"
echo ""

# Elasticsearch'ün hazır olmasını bekle
echo "Elasticsearch'ün hazır olması bekleniyor..."
until curl -s "$ELASTICSEARCH_URL/_cluster/health" > /dev/null 2>&1; do
    echo "  Bekleniyor..."
    sleep 3
done
echo "✓ Elasticsearch hazır!"
echo ""

# Cluster durumunu göster
echo "Cluster Durumu:"
curl -s "$ELASTICSEARCH_URL/_cluster/health?pretty"
echo ""

# Mevcut index varsa sil (opsiyonel)
if curl -s -o /dev/null -w "%{http_code}" "$ELASTICSEARCH_URL/$INDEX_NAME" | grep -q "200"; then
    echo "Mevcut '$INDEX_NAME' index'i siliniyor..."
    curl -X DELETE "$ELASTICSEARCH_URL/$INDEX_NAME"
    echo ""
fi

# Index'i mapping ile oluştur
echo "Index oluşturuluyor: $INDEX_NAME"
curl -X PUT "$ELASTICSEARCH_URL/$INDEX_NAME" \
    -H "Content-Type: application/json" \
    -d @"$SCRIPT_DIR/elasticsearch_kararlar_mapping.json"
echo ""

# Index durumunu kontrol et
echo ""
echo "Index Durumu:"
curl -s "$ELASTICSEARCH_URL/$INDEX_NAME/_settings?pretty" | head -20
echo ""

echo "============================================"
echo "✓ Elasticsearch kurulumu tamamlandı!"
echo "============================================"
echo ""
echo "Sonraki adımlar:"
echo "1. PostgreSQL'den verileri Elasticsearch'e aktarın:"
echo "   - Logstash kullanabilirsiniz"
echo "   - Veya sync-postgres-to-elasticsearch.sh script'ini çalıştırın"
echo ""
echo "2. SearchService'i Elasticsearch modunda başlatın:"
echo "   SEARCH_PROVIDER=elasticsearch dotnet run"
echo ""

