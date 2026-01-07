#!/usr/bin/env python3
"""
Adalet Bakanlığı Mevzuat Bilgi Sistemi - Tam Veri Çekme Scripti

Bu script, mevzuat.adalet.gov.tr sitesindeki TÜM verileri çeker:
- Tüm mevzuatlar (Kanunlar, KHK, Yönetmelikler vb.)
- Tüm içtihatlar (Yargıtay, Danıştay, İstinaf, Yerel Mahkeme kararları)

UYARI: Bu işlem çok uzun sürebilir ve milyonlarca kayıt içerir!
       Önce küçük bir test yapmanız önerilir.

Kullanım:
    python fetch_all_data.py --mode test     # Test modu (her türden 10 kayıt)
    python fetch_all_data.py --mode mevzuat  # Sadece mevzuatlar
    python fetch_all_data.py --mode ictihat  # Sadece içtihatlar
    python fetch_all_data.py --mode full     # Tüm veriler (DİKKAT!)

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
import argparse
import subprocess
from datetime import datetime
from pathlib import Path

# Proje kök dizini
SCRIPT_DIR = Path(__file__).parent

def run_command(cmd: list, description: str) -> bool:
    """Komutu çalıştır ve sonucu döndür"""
    print(f"\n{'='*60}")
    print(f"🚀 {description}")
    print(f"{'='*60}\n")
    
    try:
        result = subprocess.run(cmd, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Hata: {e}")
        return False
    except KeyboardInterrupt:
        print("\n⚠ İşlem kullanıcı tarafından durduruldu")
        return False


def test_mode():
    """Test modu - her türden az sayıda kayıt çeker"""
    print("\n" + "="*60)
    print("🧪 TEST MODU")
    print("Her mevzuat ve içtihat türünden 10 kayıt çekilecek")
    print("="*60)
    
    # Mevzuat testi
    mevzuat_script = SCRIPT_DIR / "mevzuat_scraper.py"
    for mevzuat_tur in ["KANUN", "KHK", "TUZUK"]:
        run_command(
            ["python3", str(mevzuat_script), "--type", mevzuat_tur, "--limit", "10"],
            f"Mevzuat testi: {mevzuat_tur}"
        )
    
    # İçtihat testi
    ictihat_script = SCRIPT_DIR / "ictihat_scraper.py"
    current_year = datetime.now().year
    for ictihat_tur in ["YARGITAYKARARI", "DANISTAYKARAR"]:
        run_command(
            ["python3", str(ictihat_script), "--type", ictihat_tur, 
             "--year", str(current_year), "--limit", "10"],
            f"İçtihat testi: {ictihat_tur}"
        )
    
    print("\n✅ Test tamamlandı!")


def mevzuat_mode(with_content: bool = False):
    """Tüm mevzuatları çeker"""
    print("\n" + "="*60)
    print("📚 MEVZUAT MODU")
    print("Tüm mevzuat türleri çekilecek (~20.000 kayıt)")
    print("="*60)
    
    mevzuat_script = SCRIPT_DIR / "mevzuat_scraper.py"
    cmd = ["python3", str(mevzuat_script)]
    
    if with_content:
        cmd.append("--with-content")
    
    run_command(cmd, "Tüm mevzuatlar çekiliyor...")


def ictihat_mode(year_start: int = None, year_end: int = None, 
                 with_content: bool = False):
    """İçtihatları çeker"""
    current_year = datetime.now().year
    
    if year_start is None:
        year_start = current_year - 5  # Son 5 yıl
    if year_end is None:
        year_end = current_year
    
    print("\n" + "="*60)
    print("⚖️ İÇTİHAT MODU")
    print(f"Yıl aralığı: {year_start} - {year_end}")
    print("="*60)
    
    ictihat_script = SCRIPT_DIR / "ictihat_scraper.py"
    
    # Her içtihat türü için
    ictihat_turleri = [
        "YARGITAYKARARI",
        "DANISTAYKARAR", 
        "ISTINAFHUKUK",
        "YERELHUKUK",
        "KYB"
    ]
    
    for ictihat_tur in ictihat_turleri:
        cmd = [
            "python3", str(ictihat_script),
            "--type", ictihat_tur,
            "--year-range", str(year_start), str(year_end)
        ]
        
        if with_content:
            cmd.append("--with-content")
        
        run_command(cmd, f"{ictihat_tur} çekiliyor ({year_start}-{year_end})...")


def full_mode(with_content: bool = False):
    """Tüm verileri çeker"""
    print("\n" + "="*60)
    print("⚠️  TAM VERİ MODU")
    print("Bu işlem ÇOK UZUN sürebilir!")
    print("Toplam ~11 milyon kayıt çekilecek")
    print("="*60)
    
    response = input("\nDevam etmek istiyor musunuz? (evet/hayır): ")
    if response.lower() not in ["evet", "e", "yes", "y"]:
        print("İşlem iptal edildi.")
        return
    
    # Önce mevzuatlar
    mevzuat_mode(with_content)
    
    # Sonra içtihatlar (son 10 yıl)
    current_year = datetime.now().year
    ictihat_mode(current_year - 10, current_year, with_content)


def estimate_time():
    """Tahmini süre hesapla"""
    print("\n" + "="*60)
    print("📊 TAHMİNİ SÜRE HESAPLAMA")
    print("="*60)
    
    # Varsayımlar
    mevzuat_count = 20000
    ictihat_count = 11000000
    rate_per_second = 2  # İstek/saniye
    
    mevzuat_time = mevzuat_count / rate_per_second / 3600  # saat
    ictihat_time = ictihat_count / rate_per_second / 3600  # saat
    
    print(f"\nMevzuat ({mevzuat_count:,} kayıt):")
    print(f"  - Tahmini süre: {mevzuat_time:.1f} saat")
    
    print(f"\nİçtihat ({ictihat_count:,} kayıt):")
    print(f"  - Tahmini süre: {ictihat_time:.1f} saat (~{ictihat_time/24:.0f} gün)")
    
    print(f"\nToplam tahmini süre: {(mevzuat_time + ictihat_time)/24:.0f} gün")
    print("\n💡 İpucu: İçtihatları yıl bazlı parçalara bölerek çekmeniz önerilir.")


def main():
    parser = argparse.ArgumentParser(
        description="Adalet Bakanlığı Mevzuat Bilgi Sistemi - Tam Veri Çekme",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Örnekler:
  %(prog)s --mode test                    # Test modu
  %(prog)s --mode mevzuat                 # Sadece mevzuatlar
  %(prog)s --mode ictihat --year 2024     # 2024 yılı içtihatları
  %(prog)s --mode ictihat --year-range 2020 2024  # 2020-2024 içtihatları
  %(prog)s --mode estimate                # Tahmini süre hesapla
        """
    )
    
    parser.add_argument("--mode", "-m", required=True,
                        choices=["test", "mevzuat", "ictihat", "full", "estimate"],
                        help="Çalışma modu")
    parser.add_argument("--year", "-y", type=int,
                        help="İçtihat için tek yıl")
    parser.add_argument("--year-range", "-yr", nargs=2, type=int,
                        metavar=('START', 'END'),
                        help="İçtihat için yıl aralığı")
    parser.add_argument("--with-content", "-c", action="store_true",
                        help="İçerikleri de çek (çok yavaş)")
    
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print("🏛️  ADALET BAKANLIĞI MEVZUAT BİLGİ SİSTEMİ")
    print("    Veri Çekme Aracı")
    print("="*60)
    
    if args.mode == "test":
        test_mode()
    elif args.mode == "mevzuat":
        mevzuat_mode(args.with_content)
    elif args.mode == "ictihat":
        if args.year:
            ictihat_mode(args.year, args.year, args.with_content)
        elif args.year_range:
            ictihat_mode(args.year_range[0], args.year_range[1], args.with_content)
        else:
            ictihat_mode(with_content=args.with_content)
    elif args.mode == "full":
        full_mode(args.with_content)
    elif args.mode == "estimate":
        estimate_time()


if __name__ == "__main__":
    main()
