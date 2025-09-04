# 🔧 Local Development Guide - Yargısal Zeka Microservices

Bu rehber, Yargısal Zeka microservices projesini local ortamda çalıştırmak ve test etmek için gerekli adımları içerir.

## 📋 Ön Gereksinimler

### Sistem Gereksinimleri
- **Docker & Docker Compose**: v1.27.0+
- **.NET 9.0 SDK**: https://dotnet.microsoft.com/download/dotnet/9.0
- **Node.js**: v18+ (LTS önerilir)
- **Git**: v2.30+
- **RAM**: Minimum 8GB (önerilir 16GB)
- **Disk**: Minimum 10GB boş alan

### Gerekli Yazılımlar
```bash
# Docker kurulumu kontrolü
docker --version
docker-compose --version

# .NET SDK kontrolü
dotnet --version

# Node.js kontrolü
node --version
npm --version
```

## 🚀 Kurulum Adımları

### 1. Proje İndirilmesi
```bash
# Repository'yi klonlayın
git clone https://github.com/vlikcc/yargisalzeka-dotnet-microservices.git
cd yargisalzeka-dotnet-microservices
```

### 2. Environment Dosyası Oluşturma
```bash
# .env.example dosyasından .env dosyası oluşturun
cp .env.example .env

# .env dosyasını düzenleyin (nano, vim veya editör ile)
nano .env
```

**.env dosyasındaki gerekli değerler:**
```bash
# Database Configuration
DB_PASSWORD=your_secure_password_here

# JWT Configuration
JWT_KEY=your_very_long_jwt_key_at_least_32_characters_long
JWT_ISSUER=http://localhost:5000
JWT_AUDIENCE=http://localhost:5000

# AI Service Configuration
GEMINI_API_KEY=your_google_gemini_api_key_here

# Application Environment
ASPNETCORE_ENVIRONMENT=Development
```

### 3. Docker Images'ları İndirme
```bash
# Tüm gerekli Docker images'ları indirin
docker-compose pull

# Veya sadece belirli servisler için:
docker pull postgres:17-alpine
docker pull opensearchproject/opensearch:2.11.0
```

### 4. Servisleri Başlatma
```bash
# Tüm servisleri başlatın
docker-compose up -d

# Veya sadece belirli servisleri:
docker-compose up -d postgres opensearch

# Logları takip etmek için:
docker-compose logs -f
```

### 5. Servis Durumunu Kontrol Etme
```bash
# Tüm servislerin durumunu kontrol edin
docker-compose ps

# Belirli bir servisin loglarını görüntüleyin
docker-compose logs postgres
docker-compose logs opensearch
```

## 🗄️ Database ve Search Engine Kurulumu

### PostgreSQL Database'leri
Sistem aşağıdaki 5 database'i otomatik oluşturur:
- `yargisalzeka` - Ana database
- `IdentityDb` - Kullanıcı kimlik bilgileri
- `SubscriptionDb` - Abonelik bilgileri
- `DocumentDb` - Doküman verileri
- `AIDb` - AI servis verileri

### OpenSearch Kurulumu
```bash
# OpenSearch durumunu kontrol edin
curl http://localhost:9200/_cluster/health

# Index oluşturma (gerektiğinde)
curl -X PUT "http://localhost:9200/decisions" \
  -H 'Content-Type: application/json' \
  -d '{
    "mappings": {
      "properties": {
        "title": { "type": "text", "analyzer": "turkish" },
        "content": { "type": "text", "analyzer": "turkish" },
        "court": { "type": "keyword" },
        "decision_date": { "type": "date" }
      }
    }
  }'
```

## 🔧 Development Workflow

### 1. İlk Admin Kullanıcısı Oluşturma
```bash
# Admin kullanıcısı oluşturmak için API çağrısı
curl -X POST http://localhost:5001/api/auth/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yargisalzeka.com",
    "password": "Admin123!",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

### 2. Frontend Development
```bash
# Frontend klasörüne gidin
cd frontend

# Dependencies'leri yükleyin
npm install

# Development server'ı başlatın
npm run dev

# Frontend http://localhost:5173 adresinde çalışacak
```

### 3. Backend Development
```bash
# Herhangi bir servisi development modunda çalıştırmak için:
cd AIService
dotnet run

# Veya Visual Studio'dan F5 ile debug modunda çalıştırın
```

## 🧪 API Test Endpoints

### Health Checks
```bash
# Tüm servislerin health durumunu kontrol edin
curl http://localhost:5000/health  # API Gateway
curl http://localhost:5001/health  # Identity Service
curl http://localhost:5002/health  # Subscription Service
curl http://localhost:5043/health  # Search Service
curl http://localhost:5012/health  # AI Service
```

### Authentication Test
```bash
# Login test
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yargisalzeka.com",
    "password": "Admin123!"
  }'

# JWT token'ı kaydedin (response'dan alın)
TOKEN="your_jwt_token_here"
```

### AI Service Test
```bash
# Anahtar kelime çıkarma
curl -X POST http://localhost:5000/api/gemini/extract-keywords \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"caseText": "Dava konusu olayda taraflar arasında uyuşmazlık bulunmaktadır."}'

# Dava analizi
curl -X POST http://localhost:5000/api/gemini/analyze-case \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"caseText": "Taraflar arasındaki sözleşme ihlali davasında..."}'
```

### Search Service Test
```bash
# Yargıtay kararı arama
curl -X POST http://localhost:5000/api/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"caseText": "sözleşme ihlali davası"}'
```

## 🔍 Monitoring ve Debugging

### Docker Container Logları
```bash
# Tüm container loglarını görüntüle
docker-compose logs

# Belirli bir container'ın loglarını takip et
docker-compose logs -f ai-service

# Son 100 satırı göster
docker-compose logs --tail=100 postgres
```

### Database Bağlantısı
```bash
# PostgreSQL'e bağlan
docker exec -it yargisalzeka-postgres psql -U postgres -d yargisalzeka

# Database listesi
\l

# Tabloları listele
\dt

# Çıkış
\q
```

### OpenSearch Debugging
```bash
# Cluster durumu
curl http://localhost:9200/_cluster/health?pretty

# Index listesi
curl http://localhost:9200/_cat/indices?v

# Belge arama
curl -X GET "http://localhost:9200/decisions/_search?q=sözleşme&pretty"
```

## ⚠️ Troubleshooting

### Sık Görülen Sorunlar

#### 1. Port Çakışması
```bash
# Kullanılan portları kontrol edin
netstat -tulpn | grep -E ':(5000|5001|5002|5012|5043|9200|5432)'

# Port'u kullanan process'i durdurun
sudo kill -9 <PID>
```

#### 2. Database Connection Hatası
```bash
# PostgreSQL container durumunu kontrol edin
docker-compose ps postgres

# Container'ı yeniden başlatın
docker-compose restart postgres

# Logları kontrol edin
docker-compose logs postgres
```

#### 3. OpenSearch Başlatma Sorunu
```bash
# OpenSearch container'ını yeniden başlatın
docker-compose restart opensearch

# Memory ayarlarını kontrol edin
docker-compose exec opensearch cat /usr/share/opensearch/config/jvm.options
```

#### 4. JWT Token Sorunu
```bash
# JWT key'inin uzunluğunu kontrol edin (minimum 32 karakter)
echo $JWT_KEY | wc -c

# Token'ı decode edin ve kontrol edin
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
```

#### 5. Frontend Build Hatası
```bash
# Node modules'leri temizleyin
cd frontend
rm -rf node_modules package-lock.json
npm install

# Cache'i temizleyin
npm cache clean --force
```

### Debug Modunda Çalıştırma

#### Visual Studio ile Debug
1. Solution dosyasını açın (`yargisalzeka.Net.sln`)
2. Startup project olarak istediğiniz servisi seçin
3. F5 ile debug modunda çalıştırın

#### VS Code ile Debug
1. `.vscode/launch.json` dosyası oluşturun
2. Debug configuration ekleyin
3. F5 ile debug modunda çalıştırın

## 📊 Performance Monitoring

### Resource Kullanımı
```bash
# Container resource kullanımını kontrol edin
docker stats

# Belirli container'lar için
docker stats yargisalzeka-postgres yargisalzeka-opensearch
```

### Database Performance
```bash
# Aktif bağlantıları kontrol edin
docker exec yargisalzeka-postgres psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# Table boyutlarını kontrol edin
docker exec yargisalzeka-postgres psql -U postgres -c "SELECT schemaname, tablename, attname, n_distinct FROM pg_stats WHERE schemaname = 'public';"
```

## 🔄 Development Lifecycle

### 1. Feature Development
```bash
# Yeni branch oluşturun
git checkout -b feature/yeni-ozellik

# Kod değişikliklerini yapın
# ...

# Test edin
npm run dev  # Frontend
docker-compose up -d  # Backend

# Commit edin
git add .
git commit -m "feat: yeni özellik eklendi"
```

### 2. Database Migration
```bash
# Migration oluşturun (eğer EF Core kullanıyorsanız)
cd AIService
dotnet ef migrations add MigrationName

# Migration'ı uygulayın
dotnet ef database update
```

### 3. API Testing
```bash
# Postman collection'ı import edin
# Veya curl komutları ile test edin
curl -X GET http://localhost:5000/health
```

### 4. Deployment Test
```bash
# Production benzeri environment'da test edin
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Health check yapın
curl http://localhost:5000/health
```

## 🎯 Best Practices

### Development
- ✅ Her feature için ayrı branch kullanın
- ✅ Commit mesajları açıklayıcı olsun
- ✅ Code review yapın
- ✅ Test yazın

### Database
- ✅ Migration'ları version control'e ekleyin
- ✅ Backup alın
- ✅ Index'leri optimize edin
- ✅ Connection pool ayarlarını kontrol edin

### Security
- ✅ Environment variables kullanın
- ✅ JWT token'ları güvenli saklayın
- ✅ Password policy uygulayın
- ✅ Rate limiting kullanın

### Performance
- ✅ Container resource limitlerini ayarlayın
- ✅ Database query'lerini optimize edin
- ✅ Caching kullanın
- ✅ Load balancing yapın

## 📞 Destek

Herhangi bir sorun yaşarsanız:

1. **Logları kontrol edin**: `docker-compose logs`
2. **Health check yapın**: `curl http://localhost:5000/health`
3. **Container durumunu kontrol edin**: `docker-compose ps`
4. **GitHub Issues'a problem bildirin**

---

**🎉 Local development ortamınız hazır! Başarılı kodlamalar!**
