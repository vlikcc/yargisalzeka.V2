# Yargısal Zeka Projesi Analizi ve Gereksinimler

## Mevcut Proje Yapısı

### Mikroservis Mimarisi
Proje .NET 9 tabanlı mikroservis mimarisi kullanıyor:

1. **IdentityService**: Kullanıcı kayıt & doğrulama, JWT üretimi
2. **SubscriptionService**: Kullanıcı abonelik ve kredi takibi (gRPC + EF Core)
3. **AIService**: AI destekli analiz işlemleri
   - GeminiController: `extract-keywords` endpoint'i mevcut
   - AIController: `analyze` endpoint'i mevcut
4. **DocumentService**: Belge üretimi/yönetimi (genişletilebilir)
5. **SearchService**: PostgreSQL ve OpenSearch entegrasyonu
6. **ApiGateway**: Tek giriş noktası

### Mevcut AI Endpointleri
- `/api/gemini/extract-keywords`: Anahtar kelime çıkarma
- `/api/ai/analyze`: Olay analizi

## Kullanıcı Gereksinimleri

### Abonelik Paketleri
1. **Trial Paket** (0 TL, 3 gün)
   - Anahtar kelime çıkarma: Sınırsız
   - Olay analizi: 5 adet
   - Arama yapma: 5 adet
   - Dilekçe hazırlama: 1 adet

2. **Temel Paket** (199 TL)
   - Anahtar kelime çıkarma: Sınırsız
   - Olay analizi: 5 adet
   - Arama yapma: 5 adet
   - Dilekçe hazırlama: Yok

3. **Standart Paket** (499 TL)
   - Anahtar kelime çıkarma: Sınırsız
   - Olay analizi: 50 adet
   - Arama yapma: 250 adet
   - Dilekçe hazırlama: 10 adet

4. **Premium Paket** (999 TL)
   - Tüm özellikler sınırsız

### Arama İşlemi Akışı
1. Kullanıcı olay metnini girer
2. Metin AIService'e gönderilir:
   - `analyze-case` endpoint'ine analiz için
   - `extract-keywords` endpoint'ine anahtar kelime çıkarma için
3. Çıkarılan anahtar kelimelerle arama yapılır
4. Bulunan kararlar AI tarafından puanlanır
5. En yüksek puanlı 3 karar döndürülür
6. Dilekçe oluşturma hakkı varsa dilekçe oluşturulur

### Sayfa Yapısı
- **Kayıt/Giriş Sayfaları**
- **Hesabım Sayfası**: Ana dashboard
  - Arama yapma bölümü
  - Abonelik yönetimi
  - Geçmiş aramalar
  - Kaydedilen kararlar
  - Dilekçe geçmişi

## Eksik Endpointler ve Gerekli Değişiklikler

### AIService'e Eklenecek Endpointler
1. `POST /api/gemini/analyze-case`: Olay analizi
2. `POST /api/ai/score-decisions`: Kararları puanlama
3. `POST /api/document/generate-petition`: Dilekçe oluşturma

### SubscriptionService Geliştirmeleri
1. Abonelik paket tanımları
2. Kredi tüketimi takibi
3. Paket yükseltme/düşürme
4. Trial paket otomatik ataması

### SearchService Entegrasyonu
1. Anahtar kelime bazlı arama
2. Karar puanlama sistemi
3. Arama geçmişi kaydetme

### IdentityService Geliştirmeleri
1. Kayıt sonrası trial paket ataması
2. Kullanıcı profil yönetimi

