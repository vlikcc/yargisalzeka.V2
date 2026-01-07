#!/usr/bin/env python3
"""
PostgreSQL'den Elasticsearch'e Kararlar Tablosu Aktarım Script'i

Kullanım:
    python migrate_to_elasticsearch.py

Gereksinimler:
    pip install psycopg2-binary elasticsearch

Ortam Değişkenleri (opsiyonel):
    POSTGRES_HOST     - PostgreSQL host (varsayılan: localhost)
    POSTGRES_PORT     - PostgreSQL port (varsayılan: 5432)
    POSTGRES_DB       - Veritabanı adı (varsayılan: yargitay_kararlari)
    POSTGRES_USER     - Kullanıcı adı (varsayılan: postgres)
    POSTGRES_PASSWORD - Şifre (varsayılan: postgres)
    ELASTICSEARCH_URL - Elasticsearch URL (varsayılan: http://localhost:9200)
    ELASTICSEARCH_INDEX - Index adı (varsayılan: kararlar)
"""

import os
import sys
import json
from datetime import datetime
from typing import Generator, Dict, Any
from pathlib import Path

# .env dosyasını oku
def load_env_file():
    """Proje kök dizinindeki .env dosyasını oku"""
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        print(f"📁 .env dosyası okunuyor: {env_path}")
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    if key not in os.environ:  # Mevcut env var'ları ezme
                        os.environ[key] = value
    else:
        print(f"⚠ .env dosyası bulunamadı: {env_path}")

load_env_file()

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("❌ psycopg2 yüklü değil. Lütfen çalıştırın: pip install psycopg2-binary")
    sys.exit(1)

try:
    from elasticsearch import Elasticsearch
    from elasticsearch.helpers import bulk, BulkIndexError
except ImportError:
    print("❌ elasticsearch yüklü değil. Lütfen çalıştırın: pip install elasticsearch")
    sys.exit(1)


# Konfigürasyon (.env dosyasından veya environment'tan okunur)
POSTGRES_CONFIG = {
    "host": os.getenv("POSTGRES_HOST", "localhost"),
    "port": int(os.getenv("POSTGRES_PORT", "5432")),
    "database": os.getenv("POSTGRES_DB", "yargisalzeka"),
    "user": os.getenv("POSTGRES_USER", "postgres"),
    "password": os.getenv("POSTGRES_PASSWORD", ""),
}

# Şifre kontrolü
if not POSTGRES_CONFIG["password"]:
    print("❌ POSTGRES_PASSWORD tanımlı değil! .env dosyasını kontrol edin.")
    sys.exit(1)

ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
INDEX_NAME = os.getenv("ELASTICSEARCH_INDEX", "kararlar")
BATCH_SIZE = 1000

# Elasticsearch Index Mapping (Türkçe analyzer)
INDEX_MAPPING = {
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
        "analysis": {
            "analyzer": {
                "turkish_analyzer": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": ["lowercase", "turkish_stemmer", "turkish_stop", "asciifolding"]
                }
            },
            "filter": {
                "turkish_stemmer": {"type": "stemmer", "language": "turkish"},
                "turkish_stop": {"type": "stop", "stopwords": "_turkish_"}
            }
        }
    },
    "mappings": {
        "properties": {
            "id": {"type": "long"},
            "yargitayDairesi": {
                "type": "keyword",
                "fields": {"text": {"type": "text", "analyzer": "turkish_analyzer"}}
            },
            "esasNo": {"type": "keyword"},
            "kararNo": {"type": "keyword"},
            "kararTarihi": {"type": "date", "format": "yyyy-MM-dd||yyyy-MM-dd'T'HH:mm:ss||epoch_millis", "null_value": None},
            "kararMetni": {"type": "text", "analyzer": "turkish_analyzer"}
        }
    }
}


def create_connection():
    """PostgreSQL bağlantısı oluştur"""
    try:
        conn = psycopg2.connect(**POSTGRES_CONFIG)
        print(f"✓ PostgreSQL bağlantısı kuruldu: {POSTGRES_CONFIG['host']}:{POSTGRES_CONFIG['port']}/{POSTGRES_CONFIG['database']}")
        return conn
    except Exception as e:
        print(f"❌ PostgreSQL bağlantı hatası: {e}")
        sys.exit(1)


def create_elasticsearch_client():
    """Elasticsearch client oluştur"""
    try:
        es = Elasticsearch([ELASTICSEARCH_URL])
        if not es.ping():
            raise Exception("Elasticsearch'e ping atılamadı")
        info = es.info()
        print(f"✓ Elasticsearch bağlantısı kuruldu: {ELASTICSEARCH_URL}")
        print(f"  Cluster: {info['cluster_name']}, Version: {info['version']['number']}")
        return es
    except Exception as e:
        print(f"❌ Elasticsearch bağlantı hatası: {e}")
        sys.exit(1)


def setup_index(es: Elasticsearch):
    """Index oluştur veya güncelle"""
    try:
        if es.indices.exists(index=INDEX_NAME):
            print(f"⚠ Index '{INDEX_NAME}' zaten mevcut. Siliniyor...")
            es.indices.delete(index=INDEX_NAME)
        
        es.indices.create(index=INDEX_NAME, body=INDEX_MAPPING)
        print(f"✓ Index '{INDEX_NAME}' oluşturuldu (Türkçe analyzer ile)")
    except Exception as e:
        print(f"❌ Index oluşturma hatası: {e}")
        sys.exit(1)


def get_total_count(conn) -> int:
    """Toplam kayıt sayısını al"""
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM kararlar")
        return cur.fetchone()[0]


def fetch_records(conn, batch_size: int = BATCH_SIZE) -> Generator[Dict[str, Any], None, None]:
    """Kayıtları batch halinde getir"""
    with conn.cursor(cursor_factory=RealDictCursor, name='kararlar_cursor') as cur:
        cur.itersize = batch_size
        cur.execute("""
            SELECT 
                id,
                yargitay_dairesi,
                esas_no,
                karar_no,
                karar_tarihi,
                karar_metni
            FROM kararlar
            ORDER BY id
        """)
        
        for record in cur:
            yield record


def generate_actions(records: Generator) -> Generator[Dict, None, None]:
    """Elasticsearch bulk API için action'lar oluştur"""
    for record in records:
        # Tarih formatını düzenle
        karar_tarihi = None
        if record.get('karar_tarihi'):
            if isinstance(record['karar_tarihi'], datetime):
                karar_tarihi = record['karar_tarihi'].strftime('%Y-%m-%d')
            else:
                karar_tarihi = str(record['karar_tarihi'])[:10]
        
        doc = {
            "_index": INDEX_NAME,
            "_id": str(record['id']),
            "_source": {
                "id": record['id'],
                "yargitayDairesi": record.get('yargitay_dairesi', '') or '',
                "esasNo": record.get('esas_no', '') or '',
                "kararNo": record.get('karar_no', '') or '',
                "kararTarihi": karar_tarihi,
                "kararMetni": record.get('karar_metni', '') or ''
            }
        }
        yield doc


def migrate():
    """Ana migrasyon fonksiyonu"""
    print("=" * 60)
    print("PostgreSQL → Elasticsearch Migrasyon Aracı")
    print("=" * 60)
    print()
    
    # Bağlantıları kur
    conn = create_connection()
    es = create_elasticsearch_client()
    print()
    
    # Toplam kayıt sayısını al
    total_count = get_total_count(conn)
    print(f"📊 Toplam kayıt sayısı: {total_count:,}")
    
    if total_count == 0:
        print("⚠ Aktarılacak kayıt bulunamadı!")
        conn.close()
        return
    
    print()
    
    # Index oluştur
    setup_index(es)
    print()
    
    # Verileri aktar
    print(f"🚀 Veri aktarımı başlıyor (batch size: {BATCH_SIZE})...")
    print()
    
    records = fetch_records(conn, BATCH_SIZE)
    actions = generate_actions(records)
    
    success_count = 0
    error_count = 0
    
    try:
        # Bulk indexing
        success, errors = bulk(
            es,
            actions,
            chunk_size=BATCH_SIZE,
            raise_on_error=False,
            stats_only=False
        )
        
        success_count = success
        if errors:
            error_count = len(errors)
            print(f"⚠ {error_count} kayıtta hata oluştu")
            for err in errors[:5]:  # İlk 5 hatayı göster
                print(f"   - {err}")
    
    except BulkIndexError as e:
        print(f"❌ Bulk index hatası: {e}")
        success_count = len(e.errors)
    
    except Exception as e:
        print(f"❌ Beklenmeyen hata: {e}")
    
    finally:
        conn.close()
    
    # Sonuçları göster
    print()
    print("=" * 60)
    print("📈 MİGRASYON SONUÇLARI")
    print("=" * 60)
    print(f"  Toplam kayıt    : {total_count:,}")
    print(f"  Başarılı        : {success_count:,}")
    print(f"  Hatalı          : {error_count:,}")
    print()
    
    # Index durumunu kontrol et
    try:
        count_resp = es.count(index=INDEX_NAME)
        indexed_count = count_resp['count']
        print(f"  Elasticsearch'te : {indexed_count:,} kayıt")
    except Exception as e:
        print(f"  Index sayım hatası: {e}")
    
    print()
    
    if error_count == 0 and success_count > 0:
        print("✅ Migrasyon başarıyla tamamlandı!")
    elif success_count > 0:
        print("⚠ Migrasyon bazı hatalarla tamamlandı.")
    else:
        print("❌ Migrasyon başarısız!")
    
    print()


if __name__ == "__main__":
    migrate()

