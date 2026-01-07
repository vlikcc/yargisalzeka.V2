# Adalet Bakanlığı Mevzuat Bilgi Sistemi - Veri Çekme Araçları

Bu dizin, [mevzuat.adalet.gov.tr](https://mevzuat.adalet.gov.tr) sitesindeki tüm mevzuat ve içtihat verilerini çekmek ve veritabanına kaydetmek için gerekli araçları içerir.

## 📊 Veri Kaynağı Özeti

| Kategori | Kayıt Sayısı |
|----------|-------------|
| **Mevzuat** | ~20.000 |
| - Kanunlar | 914 |
| - CB Kararnameleri | 56 |
| - Yönetmelikler | 172 |
| - CB Yönetmelikleri | 173 |
| - CB Kararları | 4.062 |
| - KHK | 63 |
| - Tüzükler | 110 |
| - Kurum Yönetmelikleri | 3.964 |
| - Üniversite Yönetmelikleri | 5.608 |
| - Tebliğler | 4.875 |
| **İçtihat** | ~11.000.000 |
| - Yargıtay Kararları | 9.776.766 |
| - Danıştay Kararları | 360.795 |
| - Yerel Mahkeme Kararları | 540.936 |
| - İstinaf Kararları | 216.358 |
| - Kanun Yararına Bozma | 1.341 |

## 🛠️ Kurulum

### Gereksinimler

```bash
# Python paketleri
pip install requests psycopg2-binary tqdm elasticsearch

# Veya requirements.txt ile
pip install -r requirements.txt
```

### Ortam Değişkenleri

Proje kök dizininde `.env` dosyası oluşturun:

```env
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=yargisalzeka
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# Elasticsearch (opsiyonel)
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=ictihatlar
```

### Veritabanı Şeması

```bash
# PostgreSQL'de şemayı oluştur
psql -U postgres -d yargisalzeka -f create_schema.sql
```

## 📁 Dosya Yapısı

```
scripts/
├── README.md                         # Bu dosya
├── create_schema.sql                 # Veritabanı şeması
├── mevzuat_scraper.py               # Mevzuat çekme scripti
├── ictihat_scraper.py               # İçtihat çekme scripti
├── fetch_all_data.py                # Ana koordinatör script
├── migrate_ictihat_to_elasticsearch.py  # ES migrasyon scripti
└── migrate_to_elasticsearch.py      # Mevcut ES migrasyon scripti
```

## 🚀 Kullanım

### 1. Test Modu (Önerilen Başlangıç)

```bash
# Her türden 10 kayıt çekerek test edin
python fetch_all_data.py --mode test
```

### 2. Mevzuat Çekme

```bash
# Tüm mevzuatları çek (~20.000 kayıt, ~3 saat)
python mevzuat_scraper.py

# Sadece kanunları çek
python mevzuat_scraper.py --type KANUN

# İçeriklerle birlikte çek (yavaş)
python mevzuat_scraper.py --with-content

# Test modu (veritabanına kaydetmeden)
python mevzuat_scraper.py --type KANUN --limit 10 --dry-run
```

### 3. İçtihat Çekme

```bash
# 2024 yılı Yargıtay kararlarını çek
python ictihat_scraper.py --type YARGITAYKARARI --year 2024

# 2020-2024 arası tüm Yargıtay kararları
python ictihat_scraper.py --type YARGITAYKARARI --year-range 2020 2024

# Anahtar kelime ile arama
python ictihat_scraper.py --type YARGITAYKARARI --phrase "tazminat" --limit 1000

# Tüm içtihat türleri (son 5 yıl)
python ictihat_scraper.py
```

### 4. Tam Veri Çekme

```bash
# Tahmini süre hesapla
python fetch_all_data.py --mode estimate

# Sadece mevzuatlar
python fetch_all_data.py --mode mevzuat

# Sadece içtihatlar (son 5 yıl)
python fetch_all_data.py --mode ictihat

# Belirli yıl aralığı
python fetch_all_data.py --mode ictihat --year-range 2020 2024

# Tüm veriler (DİKKAT: Çok uzun sürer!)
python fetch_all_data.py --mode full
```

### 5. Elasticsearch Migrasyonu

```bash
# PostgreSQL'den Elasticsearch'e aktar
python migrate_ictihat_to_elasticsearch.py
```

## ⚙️ Parametreler

### mevzuat_scraper.py

| Parametre | Açıklama |
|-----------|----------|
| `--type, -t` | Mevzuat türü (KANUN, KHK, TUZUK, vb.) |
| `--limit, -l` | Maksimum kayıt sayısı |
| `--with-content, -c` | İçerikleri de çek |
| `--delay, -d` | İstekler arası bekleme (saniye) |
| `--dry-run` | Veritabanına kaydetmeden test |

### ictihat_scraper.py

| Parametre | Açıklama |
|-----------|----------|
| `--type, -t` | İçtihat türü (YARGITAYKARARI, DANISTAYKARAR, vb.) |
| `--year, -y` | Çekilecek yıl |
| `--year-range, -yr` | Yıl aralığı (başlangıç bitiş) |
| `--phrase, -p` | Arama kelimesi |
| `--limit, -l` | Maksimum kayıt sayısı |
| `--with-content, -c` | Karar metinlerini de çek |
| `--delay, -d` | İstekler arası bekleme (saniye) |
| `--dry-run` | Veritabanına kaydetmeden test |

## 📈 Tahmini Süreler

| İşlem | Tahmini Süre |
|-------|-------------|
| Tüm mevzuatlar | ~3 saat |
| 1 yıllık Yargıtay kararları | ~12 saat |
| 5 yıllık tüm içtihatlar | ~60 saat |
| Tüm veriler (10 yıl) | ~2 hafta |

**Not:** Süreler, API rate limiting ve ağ hızına bağlı olarak değişebilir.

## 🔧 API Bilgileri

### Base URL
`https://bedesten.adalet.gov.tr`

### Mevzuat Endpoint'leri
- `POST /mevzuat/mevzuatTypes` - Mevzuat türleri
- `POST /mevzuat/searchDocuments` - Mevzuat arama
- `POST /mevzuat/getDocumentContent` - Mevzuat içeriği

### İçtihat Endpoint'leri
- `POST /emsal-karar/getItemTypes` - İçtihat türleri
- `POST /emsal-karar/getBirimler` - Daireler/birimler
- `POST /emsal-karar/searchDocuments` - İçtihat arama
- `POST /emsal-karar/getDocumentContent` - İçtihat içeriği

### Header'lar
```
Content-Type: application/json; charset=utf-8
AdaletApplicationName: UyapMevzuat
```

## ⚠️ Önemli Notlar

1. **Rate Limiting:** API'nin rate limit politikası bilinmiyor. Varsayılan olarak istekler arası 0.5 saniye bekleme yapılıyor.

2. **Sayfalama:** Mevzuat API'si maksimum 20 kayıt/sayfa, İçtihat API'si maksimum 100 kayıt/sayfa destekliyor.

3. **Arama Zorunluluğu:** İçtihat aramalarında en az 1 filtre (yıl, anahtar kelime vb.) gerekli.

4. **İçerik Formatı:** Tüm içerikler Base64 encoded HTML olarak döner.

5. **Disk Alanı:** Tüm veriler için tahmini ~50GB disk alanı gerekebilir.

6. **Kesinti Yönetimi:** Script'ler UPSERT kullanır, kesinti sonrası kaldığı yerden devam edebilir.

## 📝 Log Dosyaları

- `mevzuat_scraper.log` - Mevzuat çekme logları
- `ictihat_scraper.log` - İçtihat çekme logları

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
