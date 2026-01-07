#!/usr/bin/env python3
"""
PostgreSQL'den Elasticsearch'e İçtihat Tablosu Aktarım Script'i

Bu script, ictihatlar tablosundaki verileri Elasticsearch'e aktarır.
Mevcut kararlar tablosuyla uyumlu çalışır.

Kullanım:
    python migrate_ictihat_to_elasticsearch.py

Gereksinimler:
    pip install psycopg2-binary elasticsearch

Ortam Değişkenleri:
    POSTGRES_HOST     - PostgreSQL host (varsayılan: localhost)
    POSTGRES_PORT     - PostgreSQL port (varsayılan: 5432)
    POSTGRES_DB       - Veritabanı adı (varsayılan: yargisalzeka)
    POSTGRES_USER     - Kullanıcı adı (varsayılan: postgres)
    POSTGRES_PASSWORD - Şifre
    ELASTICSEARCH_URL - Elasticsearch URL (varsayılan: http://localhost:9200)
"""

import os
import sys
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
                    if key not in os.environ:
                        os.environ[key] = value

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


# Konfigürasyon
POSTGRES_CONFIG = {
    "host": os.getenv("POSTGRES_HOST", "localhost"),
    "port": int(os.getenv("POSTGRES_PORT", "5432")),
    "database": os.getenv("POSTGRES_DB", "yargisalzeka"),
    "user": os.getenv("POSTGRES_USER", "postgres"),
    "password": os.getenv("POSTGRES_PASSWORD", ""),
}

ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
INDEX_NAME = os.getenv("ELASTICSEARCH_INDEX", "ictihatlar")
BATCH_SIZE = 1000

# Elasticsearch Index Mapping (Türkçe analyzer)
INDEX_MAPPING = {
    "settings": {
        "number_of_shards": 2,
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
            "documentId": {"type": "keyword"},
            "itemType": {"type": "keyword"},
            "itemTypeAdi": {"type": "keyword"},
            "birimId": {"type": "keyword"},
            "birimAdi": {
                "type": "keyword",
                "fields": {"text": {"type": "text", "analyzer": "turkish_analyzer"}}
            },
            "esasNoYil": {"type": "integer"},
            "esasNoSira": {"type": "integer"},
            "kararNoYil": {"type": "integer"},
            "kararNoSira": {"type": "integer"},
            "esasNo": {"type": "keyword"},
            "kararNo": {"type": "keyword"},
            "kararTuru": {"type": "keyword"},
            "kararTarihi": {"type": "date", "format": "yyyy-MM-dd||epoch_millis"},
            "kararTarihiStr": {"type": "keyword"},
            "kesinlesmeDurumu": {"type": "keyword"},
            "kararMetni": {"type": "text", "analyzer": "turkish_analyzer"},
            # Mevcut kararlar tablosuyla uyumluluk
            "yargitayDairesi": {"type": "keyword"},
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


def setup_index(es: Elasticsearch, index_name: str = INDEX_NAME):
    """Index oluştur veya güncelle"""
    try:
        if es.indices.exists(index=index_name):
            print(f"⚠ Index '{index_name}' zaten mevcut. Siliniyor...")
            es.indices.delete(index=index_name)
        
        es.indices.create(index=index_name, body=INDEX_MAPPING)
        print(f"✓ Index '{index_name}' oluşturuldu (Türkçe analyzer ile)")
    except Exception as e:
        print(f"❌ Index oluşturma hatası: {e}")
        sys.exit(1)


def get_total_count(conn, table_name: str = "ictihatlar") -> int:
    """Toplam kayıt sayısını al"""
    with conn.cursor() as cur:
        cur.execute(f"SELECT COUNT(*) FROM {table_name}")
        return cur.fetchone()[0]


def fetch_ictihat_records(conn, batch_size: int = BATCH_SIZE) -> Generator[Dict[str, Any], None, None]:
    """İçtihat kayıtlarını batch halinde getir"""
    with conn.cursor(cursor_factory=RealDictCursor, name='ictihat_cursor') as cur:
        cur.itersize = batch_size
        cur.execute("""
            SELECT 
                id,
                document_id,
                item_type,
                item_type_adi,
                birim_id,
                birim_adi,
                esas_no_yil,
                esas_no_sira,
                karar_no_yil,
                karar_no_sira,
                esas_no,
                karar_no,
                karar_turu,
                karar_tarihi,
                karar_tarihi_str,
                kesinlesme_durumu,
                karar_metni
            FROM ictihatlar
            ORDER BY id
        """)
        
        for record in cur:
            yield record


def fetch_kararlar_records(conn, batch_size: int = BATCH_SIZE) -> Generator[Dict[str, Any], None, None]:
    """Mevcut kararlar tablosundan kayıtları getir"""
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


def generate_ictihat_actions(records: Generator, index_name: str = INDEX_NAME) -> Generator[Dict, None, None]:
    """Elasticsearch bulk API için action'lar oluştur (ictihatlar tablosu)"""
    for record in records:
        karar_tarihi = None
        if record.get('karar_tarihi'):
            if isinstance(record['karar_tarihi'], datetime):
                karar_tarihi = record['karar_tarihi'].strftime('%Y-%m-%d')
            else:
                karar_tarihi = str(record['karar_tarihi'])[:10]
        
        doc = {
            "_index": index_name,
            "_id": str(record['id']),
            "_source": {
                "id": record['id'],
                "documentId": record.get('document_id', ''),
                "itemType": record.get('item_type', ''),
                "itemTypeAdi": record.get('item_type_adi', ''),
                "birimId": record.get('birim_id', ''),
                "birimAdi": record.get('birim_adi', '') or '',
                "yargitayDairesi": record.get('birim_adi', '') or '',  # Uyumluluk için
                "esasNoYil": record.get('esas_no_yil'),
                "esasNoSira": record.get('esas_no_sira'),
                "kararNoYil": record.get('karar_no_yil'),
                "kararNoSira": record.get('karar_no_sira'),
                "esasNo": record.get('esas_no', '') or '',
                "kararNo": record.get('karar_no', '') or '',
                "kararTuru": record.get('karar_turu', ''),
                "kararTarihi": karar_tarihi,
                "kararTarihiStr": record.get('karar_tarihi_str', ''),
                "kesinlesmeDurumu": record.get('kesinlesme_durumu', ''),
                "kararMetni": record.get('karar_metni', '') or ''
            }
        }
        yield doc


def generate_kararlar_actions(records: Generator, index_name: str = "kararlar") -> Generator[Dict, None, None]:
    """Elasticsearch bulk API için action'lar oluştur (kararlar tablosu)"""
    for record in records:
        karar_tarihi = None
        if record.get('karar_tarihi'):
            if isinstance(record['karar_tarihi'], datetime):
                karar_tarihi = record['karar_tarihi'].strftime('%Y-%m-%d')
            else:
                karar_tarihi = str(record['karar_tarihi'])[:10]
        
        doc = {
            "_index": index_name,
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


def migrate_table(conn, es: Elasticsearch, table_name: str, index_name: str):
    """Belirli bir tabloyu Elasticsearch'e aktar"""
    print(f"\n{'='*60}")
    print(f"📊 {table_name} -> {index_name}")
    print("="*60)
    
    # Toplam kayıt sayısını al
    total_count = get_total_count(conn, table_name)
    print(f"Toplam kayıt sayısı: {total_count:,}")
    
    if total_count == 0:
        print("⚠ Aktarılacak kayıt bulunamadı!")
        return 0
    
    # Index oluştur
    setup_index(es, index_name)
    
    # Verileri aktar
    print(f"🚀 Veri aktarımı başlıyor (batch size: {BATCH_SIZE})...")
    
    if table_name == "ictihatlar":
        records = fetch_ictihat_records(conn, BATCH_SIZE)
        actions = generate_ictihat_actions(records, index_name)
    else:
        records = fetch_kararlar_records(conn, BATCH_SIZE)
        actions = generate_kararlar_actions(records, index_name)
    
    success_count = 0
    error_count = 0
    
    try:
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
            for err in errors[:5]:
                print(f"   - {err}")
    
    except BulkIndexError as e:
        print(f"❌ Bulk index hatası: {e}")
        success_count = len(e.errors)
    
    except Exception as e:
        print(f"❌ Beklenmeyen hata: {e}")
    
    print(f"✓ {success_count:,} kayıt aktarıldı")
    return success_count


def migrate():
    """Ana migrasyon fonksiyonu"""
    print("=" * 60)
    print("PostgreSQL → Elasticsearch İçtihat Migrasyon Aracı")
    print("=" * 60)
    print()
    
    # Şifre kontrolü
    if not POSTGRES_CONFIG["password"]:
        print("❌ POSTGRES_PASSWORD tanımlı değil! .env dosyasını kontrol edin.")
        sys.exit(1)
    
    # Bağlantıları kur
    conn = create_connection()
    es = create_elasticsearch_client()
    print()
    
    total_migrated = 0
    
    try:
        # İctihatlar tablosunu kontrol et
        with conn.cursor() as cur:
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'ictihatlar'
                )
            """)
            ictihatlar_exists = cur.fetchone()[0]
            
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'kararlar'
                )
            """)
            kararlar_exists = cur.fetchone()[0]
        
        # Tabloları aktar
        if ictihatlar_exists:
            total_migrated += migrate_table(conn, es, "ictihatlar", "ictihatlar")
        else:
            print("⚠ ictihatlar tablosu bulunamadı")
        
        if kararlar_exists:
            total_migrated += migrate_table(conn, es, "kararlar", "kararlar")
        else:
            print("⚠ kararlar tablosu bulunamadı")
            
    finally:
        conn.close()
    
    # Sonuçları göster
    print()
    print("=" * 60)
    print("📈 MİGRASYON SONUÇLARI")
    print("=" * 60)
    print(f"  Toplam aktarılan: {total_migrated:,} kayıt")
    print()
    
    if total_migrated > 0:
        print("✅ Migrasyon başarıyla tamamlandı!")
    else:
        print("⚠ Aktarılacak kayıt bulunamadı.")
    
    print()


if __name__ == "__main__":
    migrate()
