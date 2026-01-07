#!/usr/bin/env python3
"""
Adalet Bakanlığı Mevzuat Bilgi Sistemi - Mevzuat Veri Çekme Scripti

Bu script, mevzuat.adalet.gov.tr sitesindeki tüm mevzuatları çeker ve
PostgreSQL veritabanına kaydeder.

Kullanım:
    python mevzuat_scraper.py [--type MEVZUAT_TURU] [--limit LIMIT]

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
    # tqdm yoksa basit bir alternatif
    def tqdm(iterable, **kwargs):
        return iterable

# Logging ayarları
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('mevzuat_scraper.log'),
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

# Mevzuat Türleri
MEVZUAT_TURLERI = {
    "KANUN": "Kanunlar",
    "CB_KARARNAME": "Cumhurbaşkanı Kararnameleri",
    "YONETMELIK": "Bakanlar Kurulu Yönetmelikleri",
    "CB_YONETMELIK": "Cumhurbaşkanlığı Yönetmelikleri",
    "CB_KARAR": "Cumhurbaşkanı Kararları",
    "CB_GENELGE": "Cumhurbaşkanlığı Genelgeleri",
    "KHK": "Kanun Hükmünde Kararnameler",
    "TUZUK": "Tüzükler",
    "KKY": "Kurum ve Kuruluş Yönetmelikleri",
    "UY": "Üniversite Yönetmelikleri",
    "TEBLIGLER": "Tebliğler",
    "MULGA": "Mülga Mevzuat"
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


class MevzuatAPI:
    """Mevzuat API istemcisi"""
    
    def __init__(self, rate_limit_delay: float = 0.5):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.rate_limit_delay = rate_limit_delay
        
    def _make_request(self, endpoint: str, data: dict) -> Optional[dict]:
        """API isteği yapar"""
        url = f"{BASE_URL}{endpoint}"
        try:
            time.sleep(self.rate_limit_delay)  # Rate limiting
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
    
    def get_mevzuat_types(self) -> List[dict]:
        """Mevzuat türlerini getirir"""
        data = self._make_request("/mevzuat/mevzuatTypes", {})
        return data if data else []
    
    def search_mevzuat(self, mevzuat_tur: str, page_number: int = 1, 
                       page_size: int = 100) -> Optional[dict]:
        """Mevzuat arar"""
        payload = {
            "data": {
                "pageSize": page_size,
                "pageNumber": page_number,
                "mevzuatTurList": [mevzuat_tur],
                "sortFields": ["RESMI_GAZETE_TARIHI"],
                "sortDirection": "desc"
            },
            "applicationName": "UyapMevzuat",
            "paging": True
        }
        return self._make_request("/mevzuat/searchDocuments", payload)
    
    def get_mevzuat_content(self, mevzuat_id: str) -> Optional[str]:
        """Mevzuat içeriğini getirir"""
        payload = {
            "data": {
                "documentType": "MEVZUAT",
                "id": mevzuat_id
            },
            "applicationName": "UyapMevzuat"
        }
        result = self._make_request("/mevzuat/getDocumentContent", payload)
        if result and result.get("content"):
            html_content = decode_content(result["content"])
            return extract_text_from_html(html_content)
        return None
    
    def fetch_all_mevzuat(self, mevzuat_tur: str, 
                          limit: Optional[int] = None) -> Generator[dict, None, None]:
        """Belirli türdeki tüm mevzuatları getirir"""
        page_number = 1
        page_size = 20  # API limiti maksimum 20
        total_fetched = 0
        
        while True:
            logger.info(f"Sayfa {page_number} çekiliyor ({mevzuat_tur})...")
            result = self.search_mevzuat(mevzuat_tur, page_number, page_size)
            
            if not result or not result.get("mevzuatList"):
                break
                
            mevzuat_list = result["mevzuatList"]
            total = result.get("total", 0)
            
            for mevzuat in mevzuat_list:
                if limit and total_fetched >= limit:
                    return
                    
                yield mevzuat
                total_fetched += 1
            
            # Sonraki sayfa var mı?
            if len(mevzuat_list) < page_size or total_fetched >= total:
                break
                
            page_number += 1
            
        logger.info(f"Toplam {total_fetched} mevzuat çekildi ({mevzuat_tur})")


class MevzuatDatabase:
    """Mevzuat veritabanı işlemleri"""
    
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
        """Mevzuat tablolarını oluştur"""
        create_sql = """
        CREATE TABLE IF NOT EXISTS mevzuatlar (
            id SERIAL PRIMARY KEY,
            mevzuat_id VARCHAR(50) UNIQUE NOT NULL,
            mevzuat_no INTEGER,
            mevzuat_adi TEXT NOT NULL,
            mevzuat_tur VARCHAR(50),
            mevzuat_tur_adi VARCHAR(200),
            mevzuat_tertip INTEGER,
            kayit_tarihi TIMESTAMP,
            guncelleme_tarihi TIMESTAMP,
            resmi_gazete_tarihi DATE,
            resmi_gazete_sayisi VARCHAR(50),
            url TEXT,
            icerik TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_mevzuatlar_tur ON mevzuatlar(mevzuat_tur);
        CREATE INDEX IF NOT EXISTS idx_mevzuatlar_no ON mevzuatlar(mevzuat_no);
        CREATE INDEX IF NOT EXISTS idx_mevzuatlar_tarih ON mevzuatlar(resmi_gazete_tarihi);
        
        -- Full-text search için
        CREATE INDEX IF NOT EXISTS idx_mevzuatlar_adi_gin ON mevzuatlar 
            USING gin(to_tsvector('turkish', mevzuat_adi));
        CREATE INDEX IF NOT EXISTS idx_mevzuatlar_icerik_gin ON mevzuatlar 
            USING gin(to_tsvector('turkish', COALESCE(icerik, '')));
        """
        
        with self.conn.cursor() as cur:
            cur.execute(create_sql)
        self.conn.commit()
        logger.info("Mevzuat tabloları oluşturuldu")
        
    def upsert_mevzuat(self, mevzuat: dict, icerik: Optional[str] = None):
        """Mevzuat ekle veya güncelle"""
        upsert_sql = """
        INSERT INTO mevzuatlar (
            mevzuat_id, mevzuat_no, mevzuat_adi, mevzuat_tur, mevzuat_tur_adi,
            mevzuat_tertip, kayit_tarihi, guncelleme_tarihi, resmi_gazete_tarihi,
            resmi_gazete_sayisi, url, icerik, updated_at
        ) VALUES (
            %(mevzuat_id)s, %(mevzuat_no)s, %(mevzuat_adi)s, %(mevzuat_tur)s,
            %(mevzuat_tur_adi)s, %(mevzuat_tertip)s, %(kayit_tarihi)s,
            %(guncelleme_tarihi)s, %(resmi_gazete_tarihi)s, %(resmi_gazete_sayisi)s,
            %(url)s, %(icerik)s, CURRENT_TIMESTAMP
        )
        ON CONFLICT (mevzuat_id) DO UPDATE SET
            mevzuat_no = EXCLUDED.mevzuat_no,
            mevzuat_adi = EXCLUDED.mevzuat_adi,
            mevzuat_tur = EXCLUDED.mevzuat_tur,
            mevzuat_tur_adi = EXCLUDED.mevzuat_tur_adi,
            mevzuat_tertip = EXCLUDED.mevzuat_tertip,
            kayit_tarihi = EXCLUDED.kayit_tarihi,
            guncelleme_tarihi = EXCLUDED.guncelleme_tarihi,
            resmi_gazete_tarihi = EXCLUDED.resmi_gazete_tarihi,
            resmi_gazete_sayisi = EXCLUDED.resmi_gazete_sayisi,
            url = EXCLUDED.url,
            icerik = COALESCE(EXCLUDED.icerik, mevzuatlar.icerik),
            updated_at = CURRENT_TIMESTAMP
        """
        
        # Tarih dönüşümleri
        kayit_tarihi = None
        if mevzuat.get("kayitTarihi"):
            try:
                kayit_tarihi = datetime.fromisoformat(
                    mevzuat["kayitTarihi"].replace("Z", "+00:00").split(".")[0]
                )
            except:
                pass
                
        guncelleme_tarihi = None
        if mevzuat.get("guncellemeTarihi"):
            try:
                guncelleme_tarihi = datetime.fromisoformat(
                    mevzuat["guncellemeTarihi"].replace("Z", "+00:00").split(".")[0]
                )
            except:
                pass
                
        resmi_gazete_tarihi = None
        if mevzuat.get("resmiGazeteTarihi"):
            try:
                resmi_gazete_tarihi = datetime.fromisoformat(
                    mevzuat["resmiGazeteTarihi"].replace("Z", "+00:00").split(".")[0]
                ).date()
            except:
                pass
        
        mevzuat_tur = mevzuat.get("mevzuatTur", {})
        
        params = {
            "mevzuat_id": mevzuat.get("mevzuatId"),
            "mevzuat_no": mevzuat.get("mevzuatNo"),
            "mevzuat_adi": mevzuat.get("mevzuatAdi"),
            "mevzuat_tur": mevzuat_tur.get("name") if isinstance(mevzuat_tur, dict) else None,
            "mevzuat_tur_adi": mevzuat_tur.get("description") if isinstance(mevzuat_tur, dict) else None,
            "mevzuat_tertip": mevzuat.get("mevzuatTertip"),
            "kayit_tarihi": kayit_tarihi,
            "guncelleme_tarihi": guncelleme_tarihi,
            "resmi_gazete_tarihi": resmi_gazete_tarihi,
            "resmi_gazete_sayisi": mevzuat.get("resmiGazeteSayisi"),
            "url": mevzuat.get("url"),
            "icerik": icerik
        }
        
        with self.conn.cursor() as cur:
            cur.execute(upsert_sql, params)
        self.conn.commit()
        
    def get_stats(self) -> dict:
        """Veritabanı istatistiklerini getir"""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT mevzuat_tur, COUNT(*) as count 
                FROM mevzuatlar 
                GROUP BY mevzuat_tur 
                ORDER BY count DESC
            """)
            stats = dict(cur.fetchall())
            
            cur.execute("SELECT COUNT(*) FROM mevzuatlar")
            total = cur.fetchone()[0]
            
        return {"total": total, "by_type": stats}


def main():
    parser = argparse.ArgumentParser(description="Mevzuat Veri Çekme Scripti")
    parser.add_argument("--type", "-t", choices=list(MEVZUAT_TURLERI.keys()),
                        help="Çekilecek mevzuat türü (belirtilmezse tümü)")
    parser.add_argument("--limit", "-l", type=int,
                        help="Her tür için maksimum kayıt sayısı")
    parser.add_argument("--with-content", "-c", action="store_true",
                        help="İçerikleri de çek (yavaş)")
    parser.add_argument("--delay", "-d", type=float, default=0.5,
                        help="İstekler arası bekleme süresi (saniye)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Veritabanına kaydetmeden test et")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("Mevzuat Veri Çekme Scripti")
    print("=" * 60)
    print()
    
    # API istemcisi
    api = MevzuatAPI(rate_limit_delay=args.delay)
    
    # Veritabanı
    db = None
    if not args.dry_run:
        if not POSTGRES_CONFIG["password"]:
            print("❌ POSTGRES_PASSWORD tanımlı değil!")
            sys.exit(1)
            
        db = MevzuatDatabase()
        db.connect()
        db.create_tables()
    
    # Çekilecek türler
    types_to_fetch = [args.type] if args.type else list(MEVZUAT_TURLERI.keys())
    
    total_count = 0
    
    try:
        for mevzuat_tur in types_to_fetch:
            print(f"\n📁 {MEVZUAT_TURLERI[mevzuat_tur]} çekiliyor...")
            
            count = 0
            for mevzuat in tqdm(api.fetch_all_mevzuat(mevzuat_tur, args.limit),
                               desc=mevzuat_tur):
                
                icerik = None
                if args.with_content:
                    mevzuat_id = mevzuat.get("mevzuatId")
                    if mevzuat_id:
                        icerik = api.get_mevzuat_content(mevzuat_id)
                
                if db:
                    db.upsert_mevzuat(mevzuat, icerik)
                    
                count += 1
                
            print(f"  ✓ {count} kayıt işlendi")
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
    
    print(f"\n✅ İşlem tamamlandı! Toplam {total_count} mevzuat işlendi.")


if __name__ == "__main__":
    main()
