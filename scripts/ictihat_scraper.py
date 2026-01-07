#!/usr/bin/env python3
"""
Adalet Bakanlığı Mevzuat Bilgi Sistemi - İçtihat Veri Çekme Scripti

Bu script, mevzuat.adalet.gov.tr sitesindeki tüm içtihatları (Yargıtay, Danıştay,
İstinaf, Yerel Mahkeme kararları) çeker ve PostgreSQL veritabanına kaydeder.

Kullanım:
    python ictihat_scraper.py [--type ICTIHAT_TURU] [--limit LIMIT] [--phrase ARAMA]

Gereksinimler:
    pip install requests psycopg2-binary tqdm

Ortam Değişkenleri:
    POSTGRES_HOST     - PostgreSQL host (varsayılan: localhost)
    POSTGRES_PORT     - PostgreSQL port (varsayılan: 5432)
    POSTGRES_DB       - Veritabanı adı (varsayılan: yargisalzeka)
    POSTGRES_USER     - Kullanıcı adı (varsayılan: postgres)
    POSTGRES_PASSWORD - Şifre
"""

import os
import sys
import json
import time
import base64
import argparse
import logging
from datetime import datetime
from typing import Dict, List, Optional, Generator
from pathlib import Path
from html.parser import HTMLParser

# .env dosyasını oku
def load_env_file():
    """Proje kök dizinindeki .env dosyasını oku"""
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
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
    import requests
except ImportError:
    print("❌ requests yüklü değil. Lütfen çalıştırın: pip install requests")
    sys.exit(1)

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    print("❌ psycopg2 yüklü değil. Lütfen çalıştırın: pip install psycopg2-binary")
    sys.exit(1)

try:
    from tqdm import tqdm
except ImportError:
    def tqdm(iterable, **kwargs):
        return iterable

# Logging ayarları
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ictihat_scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# API Konfigürasyonu
BASE_URL = "https://bedesten.adalet.gov.tr"
HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    "AdaletApplicationName": "UyapMevzuat",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

# İçtihat Türleri
ICTIHAT_TURLERI = {
    "YARGITAYKARARI": "Yargıtay Kararı",
    "DANISTAYKARAR": "Danıştay Kararı",
    "YERELHUKUK": "Yerel Hukuk Mahkemesi Kararı",
    "ISTINAFHUKUK": "İstinaf Hukuk Mahkemesi Kararı",
    "KYB": "Kanun Yararına Bozma Kararları"
}

# PostgreSQL Konfigürasyonu
POSTGRES_CONFIG = {
    "host": os.getenv("POSTGRES_HOST", "localhost"),
    "port": int(os.getenv("POSTGRES_PORT", "5432")),
    "database": os.getenv("POSTGRES_DB", "yargisalzeka"),
    "user": os.getenv("POSTGRES_USER", "postgres"),
    "password": os.getenv("POSTGRES_PASSWORD", ""),
}


class HTMLTextExtractor(HTMLParser):
    """HTML'den düz metin çıkarır"""
    def __init__(self):
        super().__init__()
        self.text_parts = []
        
    def handle_data(self, data):
        self.text_parts.append(data)
        
    def get_text(self):
        return ' '.join(self.text_parts).strip()


def extract_text_from_html(html_content: str) -> str:
    """HTML içeriğinden düz metin çıkarır"""
    parser = HTMLTextExtractor()
    try:
        parser.feed(html_content)
        return parser.get_text()
    except:
        return html_content


def decode_content(base64_content: str) -> str:
    """Base64 encoded içeriği decode eder"""
    try:
        decoded = base64.b64decode(base64_content).decode('utf-8')
        return decoded
    except Exception as e:
        logger.warning(f"İçerik decode hatası: {e}")
        return ""


class IctihatAPI:
    """İçtihat API istemcisi"""
    
    def __init__(self, rate_limit_delay: float = 0.5):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.rate_limit_delay = rate_limit_delay
        
    def _make_request(self, endpoint: str, data: dict) -> Optional[dict]:
        """API isteği yapar"""
        url = f"{BASE_URL}{endpoint}"
        try:
            time.sleep(self.rate_limit_delay)
            response = self.session.post(url, json=data, timeout=30)
            response.raise_for_status()
            result = response.json()
            
            if result.get("metadata", {}).get("FMTY") == "SUCCESS":
                return result.get("data")
            else:
                error_msg = result.get("metadata", {}).get("FMTE", "Bilinmeyen hata")
                logger.warning(f"API hatası: {error_msg}")
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"İstek hatası ({endpoint}): {e}")
            return None
    
    def get_item_types(self) -> List[dict]:
        """İçtihat türlerini getirir"""
        data = self._make_request("/emsal-karar/getItemTypes", 
                                   {"applicationName": "UyapMevzuat"})
        return data if data else []
    
    def get_birimler(self, item_type: str) -> List[dict]:
        """Daireleri/birimleri getirir"""
        payload = {
            "data": {"itemType": item_type},
            "applicationName": "UyapMevzuat"
        }
        data = self._make_request("/emsal-karar/getBirimler", payload)
        return data if data else []
    
    def search_ictihat(self, item_type: str, page_number: int = 1, 
                       page_size: int = 100, phrase: str = None,
                       birim_id: str = None, esas_yil: int = None,
                       karar_yil: int = None) -> Optional[dict]:
        """İçtihat arar"""
        
        # En az bir filtre gerekli
        data_params = {
            "pageSize": page_size,
            "pageNumber": page_number,
            "itemTypeList": [item_type],
            "sortFields": ["KARAR_TARIHI"],
            "sortDirection": "desc"
        }
        
        # Filtreler
        if phrase:
            data_params["phrase"] = phrase
        if birim_id:
            data_params["birimIdList"] = [birim_id]
        if esas_yil:
            data_params["esasNoYil"] = esas_yil
        if karar_yil:
            data_params["kararNoYil"] = karar_yil
            
        # Eğer hiç filtre yoksa, yıl bazlı çekim yap
        if not any([phrase, birim_id, esas_yil, karar_yil]):
            # Varsayılan olarak son yılı çek
            current_year = datetime.now().year
            data_params["kararNoYil"] = current_year
        
        payload = {
            "data": data_params,
            "applicationName": "UyapMevzuat",
            "paging": True
        }
        
        return self._make_request("/emsal-karar/searchDocuments", payload)
    
    def get_ictihat_content(self, document_id: str) -> Optional[str]:
        """İçtihat içeriğini getirir"""
        payload = {
            "data": {"documentId": document_id},
            "applicationName": "UyapMevzuat"
        }
        result = self._make_request("/emsal-karar/getDocumentContent", payload)
        if result and result.get("content"):
            html_content = decode_content(result["content"])
            return extract_text_from_html(html_content)
        return None
    
    def fetch_ictihat_by_year(self, item_type: str, year: int,
                              limit: Optional[int] = None) -> Generator[dict, None, None]:
        """Belirli yıldaki içtihatları getirir"""
        page_number = 1
        page_size = 100
        total_fetched = 0
        
        while True:
            logger.info(f"Sayfa {page_number} çekiliyor ({item_type}, {year})...")
            result = self.search_ictihat(item_type, page_number, page_size, 
                                         karar_yil=year)
            
            if not result or not result.get("emsalKararList"):
                break
                
            karar_list = result["emsalKararList"]
            total = result.get("total", 0)
            
            for karar in karar_list:
                if limit and total_fetched >= limit:
                    return
                    
                yield karar
                total_fetched += 1
            
            if len(karar_list) < page_size or total_fetched >= total:
                break
                
            page_number += 1
            
        logger.info(f"Toplam {total_fetched} içtihat çekildi ({item_type}, {year})")
    
    def fetch_ictihat_by_phrase(self, item_type: str, phrase: str,
                                limit: Optional[int] = None) -> Generator[dict, None, None]:
        """Anahtar kelimeye göre içtihat arar"""
        page_number = 1
        page_size = 100
        total_fetched = 0
        
        while True:
            logger.info(f"Sayfa {page_number} çekiliyor ({item_type}, '{phrase}')...")
            result = self.search_ictihat(item_type, page_number, page_size, 
                                         phrase=phrase)
            
            if not result or not result.get("emsalKararList"):
                break
                
            karar_list = result["emsalKararList"]
            total = result.get("total", 0)
            
            for karar in karar_list:
                if limit and total_fetched >= limit:
                    return
                    
                yield karar
                total_fetched += 1
            
            if len(karar_list) < page_size or total_fetched >= total:
                break
                
            page_number += 1
            
        logger.info(f"Toplam {total_fetched} içtihat çekildi ({item_type}, '{phrase}')")


class IctihatDatabase:
    """İçtihat veritabanı işlemleri"""
    
    def __init__(self):
        self.conn = None
        
    def connect(self):
        """Veritabanına bağlan"""
        try:
            self.conn = psycopg2.connect(**POSTGRES_CONFIG)
            logger.info(f"PostgreSQL bağlantısı kuruldu: {POSTGRES_CONFIG['host']}")
        except Exception as e:
            logger.error(f"Veritabanı bağlantı hatası: {e}")
            raise
            
    def close(self):
        """Bağlantıyı kapat"""
        if self.conn:
            self.conn.close()
            
    def create_tables(self):
        """İçtihat tablolarını oluştur"""
        create_sql = """
        -- Ana içtihat tablosu
        CREATE TABLE IF NOT EXISTS ictihatlar (
            id SERIAL PRIMARY KEY,
            document_id VARCHAR(50) UNIQUE NOT NULL,
            item_type VARCHAR(50) NOT NULL,
            item_type_adi VARCHAR(200),
            birim_id VARCHAR(50),
            birim_adi VARCHAR(200),
            esas_no_yil INTEGER,
            esas_no_sira INTEGER,
            karar_no_yil INTEGER,
            karar_no_sira INTEGER,
            esas_no VARCHAR(50),
            karar_no VARCHAR(50),
            karar_turu VARCHAR(100),
            karar_tarihi DATE,
            karar_tarihi_str VARCHAR(20),
            kesinlesme_durumu VARCHAR(50),
            karar_metni TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- İndeksler
        CREATE INDEX IF NOT EXISTS idx_ictihatlar_type ON ictihatlar(item_type);
        CREATE INDEX IF NOT EXISTS idx_ictihatlar_birim ON ictihatlar(birim_adi);
        CREATE INDEX IF NOT EXISTS idx_ictihatlar_esas ON ictihatlar(esas_no_yil, esas_no_sira);
        CREATE INDEX IF NOT EXISTS idx_ictihatlar_karar ON ictihatlar(karar_no_yil, karar_no_sira);
        CREATE INDEX IF NOT EXISTS idx_ictihatlar_tarih ON ictihatlar(karar_tarihi);
        
        -- Full-text search için
        CREATE INDEX IF NOT EXISTS idx_ictihatlar_metin_gin ON ictihatlar 
            USING gin(to_tsvector('turkish', COALESCE(karar_metni, '')));
            
        -- Mevcut kararlar tablosuyla uyumluluk için view
        CREATE OR REPLACE VIEW kararlar_view AS
        SELECT 
            id,
            birim_adi as yargitay_dairesi,
            esas_no,
            karar_no,
            karar_tarihi,
            karar_metni
        FROM ictihatlar
        WHERE item_type = 'YARGITAYKARARI';
        """
        
        with self.conn.cursor() as cur:
            cur.execute(create_sql)
        self.conn.commit()
        logger.info("İçtihat tabloları oluşturuldu")
        
    def upsert_ictihat(self, ictihat: dict, karar_metni: Optional[str] = None):
        """İçtihat ekle veya güncelle"""
        upsert_sql = """
        INSERT INTO ictihatlar (
            document_id, item_type, item_type_adi, birim_id, birim_adi,
            esas_no_yil, esas_no_sira, karar_no_yil, karar_no_sira,
            esas_no, karar_no, karar_turu, karar_tarihi, karar_tarihi_str,
            kesinlesme_durumu, karar_metni, updated_at
        ) VALUES (
            %(document_id)s, %(item_type)s, %(item_type_adi)s, %(birim_id)s,
            %(birim_adi)s, %(esas_no_yil)s, %(esas_no_sira)s, %(karar_no_yil)s,
            %(karar_no_sira)s, %(esas_no)s, %(karar_no)s, %(karar_turu)s,
            %(karar_tarihi)s, %(karar_tarihi_str)s, %(kesinlesme_durumu)s,
            %(karar_metni)s, CURRENT_TIMESTAMP
        )
        ON CONFLICT (document_id) DO UPDATE SET
            item_type = EXCLUDED.item_type,
            item_type_adi = EXCLUDED.item_type_adi,
            birim_id = EXCLUDED.birim_id,
            birim_adi = EXCLUDED.birim_adi,
            esas_no_yil = EXCLUDED.esas_no_yil,
            esas_no_sira = EXCLUDED.esas_no_sira,
            karar_no_yil = EXCLUDED.karar_no_yil,
            karar_no_sira = EXCLUDED.karar_no_sira,
            esas_no = EXCLUDED.esas_no,
            karar_no = EXCLUDED.karar_no,
            karar_turu = EXCLUDED.karar_turu,
            karar_tarihi = EXCLUDED.karar_tarihi,
            karar_tarihi_str = EXCLUDED.karar_tarihi_str,
            kesinlesme_durumu = EXCLUDED.kesinlesme_durumu,
            karar_metni = COALESCE(EXCLUDED.karar_metni, ictihatlar.karar_metni),
            updated_at = CURRENT_TIMESTAMP
        """
        
        # Tarih dönüşümü
        karar_tarihi = None
        if ictihat.get("kararTarihi"):
            try:
                karar_tarihi = datetime.fromisoformat(
                    ictihat["kararTarihi"].replace("Z", "+00:00").split(".")[0]
                ).date()
            except:
                pass
        
        item_type = ictihat.get("itemType", {})
        
        params = {
            "document_id": ictihat.get("documentId"),
            "item_type": item_type.get("name") if isinstance(item_type, dict) else None,
            "item_type_adi": item_type.get("description") if isinstance(item_type, dict) else None,
            "birim_id": ictihat.get("birimId"),
            "birim_adi": ictihat.get("birimAdi"),
            "esas_no_yil": ictihat.get("esasNoYil"),
            "esas_no_sira": ictihat.get("esasNoSira"),
            "karar_no_yil": ictihat.get("kararNoYil"),
            "karar_no_sira": ictihat.get("kararNoSira"),
            "esas_no": ictihat.get("esasNo"),
            "karar_no": ictihat.get("kararNo"),
            "karar_turu": ictihat.get("kararTuru"),
            "karar_tarihi": karar_tarihi,
            "karar_tarihi_str": ictihat.get("kararTarihiStr"),
            "kesinlesme_durumu": ictihat.get("kesinlesmeDurumu"),
            "karar_metni": karar_metni
        }
        
        with self.conn.cursor() as cur:
            cur.execute(upsert_sql, params)
        self.conn.commit()
        
    def get_stats(self) -> dict:
        """Veritabanı istatistiklerini getir"""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT item_type, COUNT(*) as count 
                FROM ictihatlar 
                GROUP BY item_type 
                ORDER BY count DESC
            """)
            stats = dict(cur.fetchall())
            
            cur.execute("SELECT COUNT(*) FROM ictihatlar")
            total = cur.fetchone()[0]
            
        return {"total": total, "by_type": stats}


def main():
    parser = argparse.ArgumentParser(description="İçtihat Veri Çekme Scripti")
    parser.add_argument("--type", "-t", choices=list(ICTIHAT_TURLERI.keys()),
                        help="Çekilecek içtihat türü (belirtilmezse tümü)")
    parser.add_argument("--year", "-y", type=int,
                        help="Çekilecek yıl (varsayılan: güncel yıl)")
    parser.add_argument("--year-range", "-yr", nargs=2, type=int, metavar=('START', 'END'),
                        help="Yıl aralığı (örn: 2020 2024)")
    parser.add_argument("--phrase", "-p", type=str,
                        help="Arama kelimesi")
    parser.add_argument("--limit", "-l", type=int,
                        help="Her tür/yıl için maksimum kayıt sayısı")
    parser.add_argument("--with-content", "-c", action="store_true",
                        help="İçerikleri de çek (yavaş)")
    parser.add_argument("--delay", "-d", type=float, default=0.5,
                        help="İstekler arası bekleme süresi (saniye)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Veritabanına kaydetmeden test et")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("İçtihat Veri Çekme Scripti")
    print("=" * 60)
    print()
    
    # API istemcisi
    api = IctihatAPI(rate_limit_delay=args.delay)
    
    # Veritabanı
    db = None
    if not args.dry_run:
        if not POSTGRES_CONFIG["password"]:
            print("❌ POSTGRES_PASSWORD tanımlı değil!")
            sys.exit(1)
            
        db = IctihatDatabase()
        db.connect()
        db.create_tables()
    
    # Çekilecek türler
    types_to_fetch = [args.type] if args.type else list(ICTIHAT_TURLERI.keys())
    
    # Yıllar
    current_year = datetime.now().year
    if args.year_range:
        years = list(range(args.year_range[0], args.year_range[1] + 1))
    elif args.year:
        years = [args.year]
    else:
        years = [current_year]  # Varsayılan olarak sadece güncel yıl
    
    total_count = 0
    
    try:
        for ictihat_tur in types_to_fetch:
            print(f"\n📁 {ICTIHAT_TURLERI[ictihat_tur]} çekiliyor...")
            
            if args.phrase:
                # Anahtar kelime ile arama
                count = 0
                for ictihat in tqdm(api.fetch_ictihat_by_phrase(ictihat_tur, args.phrase, args.limit),
                                   desc=f"{ictihat_tur} ({args.phrase})"):
                    
                    karar_metni = None
                    if args.with_content:
                        doc_id = ictihat.get("documentId")
                        if doc_id:
                            karar_metni = api.get_ictihat_content(doc_id)
                    
                    if db:
                        db.upsert_ictihat(ictihat, karar_metni)
                        
                    count += 1
                    
                print(f"  ✓ {count} kayıt işlendi")
                total_count += count
            else:
                # Yıl bazlı çekim
                for year in years:
                    count = 0
                    for ictihat in tqdm(api.fetch_ictihat_by_year(ictihat_tur, year, args.limit),
                                       desc=f"{ictihat_tur} ({year})"):
                        
                        karar_metni = None
                        if args.with_content:
                            doc_id = ictihat.get("documentId")
                            if doc_id:
                                karar_metni = api.get_ictihat_content(doc_id)
                        
                        if db:
                            db.upsert_ictihat(ictihat, karar_metni)
                            
                        count += 1
                        
                    print(f"  ✓ {year}: {count} kayıt işlendi")
                    total_count += count
            
    except KeyboardInterrupt:
        print("\n\n⚠ İşlem kullanıcı tarafından durduruldu")
        
    finally:
        if db:
            stats = db.get_stats()
            print(f"\n📊 Veritabanı İstatistikleri:")
            print(f"   Toplam: {stats['total']} kayıt")
            for tur, count in stats.get("by_type", {}).items():
                print(f"   - {tur}: {count}")
            db.close()
    
    print(f"\n✅ İşlem tamamlandı! Toplam {total_count} içtihat işlendi.")


if __name__ == "__main__":
    main()
