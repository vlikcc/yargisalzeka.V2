# 🚀 Yargısal Zeka .NET Mikroservis Projesi

Modern, production-ready microservices architecture ile Yargısal Zeka platformu. Google Gemini AI, PostgreSQL, OpenSearch ve React frontend ile tam entegre sistem.

## 📋 Özellikler

### 🔐 **Authentication & Authorization**
- JWT tabanlı kimlik doğrulama
- Role-based access control (User, Admin, SuperAdmin)
- Admin dashboard ve kullanıcı yönetimi

### 🤖 **AI & Analytics**
- Google Gemini AI entegrasyonu
- Anahtar kelime çıkarma
- Dava analizi ve ilgili karar bulma
- Dilekçe oluşturma

### 🏗️ **Microservices Architecture**
- **IdentityService**: Kullanıcı yönetimi ve JWT token
- **SubscriptionService**: Abonelik ve kredi takibi
- **AIService**: Google Gemini AI işlemleri
- **SearchService**: Yargıtay kararı arama ve index
- **DocumentService**: Doküman yönetimi
- **ApiGateway**: Ocelot ile centralized routing

### 🗄️ **Database & Search**
- PostgreSQL ile ilişkisel veri
- OpenSearch ile full-text search
- Entity Framework Core migrations
- Otomatik database oluşturma

## ⚡ Hızlı Başlangıç

### Local Development (Önerilen) - Production Veritabanını Koruyarak

```bash
# 1. Projeyi klonlayın
git clone https://github.com/vlikcc/yargisalzeka-dotnet-microservices.git
cd yargisalzeka-dotnet-microservices

# 2. ⚠️ PRODUCTION VERİTABANINI YEDEKLEYİN
./scripts/backup-production.sh

# 3. Environment dosyasını oluşturun
cp .env.example .env
# .env dosyasını düzenleyin (JWT_KEY, DB_PASSWORD, GEMINI_API_KEY)

# 4. Servisleri başlatın (development veritabanları otomatik oluşturulacak)
docker-compose up -d

# 5. Health check yapın
curl http://localhost:5000/health

# 6. Admin kullanıcısı oluşturun
curl -X POST http://localhost:5001/api/auth/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin123!",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

### Detaylı Kurulum
Detaylı kurulum adımları için `LOCAL_DEVELOPMENT.md` dosyasını inceleyin.

### Docker Compose Yapılandırması
Projemizde **3 farklı Docker Compose dosyası** bulunmaktadır:

- **`docker-compose.yml`** - Ana yapılandırma dosyası
- **`docker-compose.override.yml`** - Development override (otomatik kullanılır)
- **`docker-compose.prod.yml`** - Production override (manuel olarak belirtilmelidir)

**Kullanım:**

```bash
# Development (otomatik override kullanır)
docker-compose up -d

# Production (manuel override belirtin)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Belirli bir override ile
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

### Quick Start
5 dakikalık hızlı kurulum için `QUICK_START.md` dosyasını inceleyin.

## 🧪 Test ve API Endpoints

### Testleri Çalıştırma
```bash
# Tüm testleri çalıştır
dotnet test

# Belirli bir projenin testlerini çalıştır
dotnet test Tests/IdentityService.UnitTests/IdentityService.UnitTests.csproj

# Coverage ile test çalıştır
dotnet test --collect:"XPlat Code Coverage"
```

### API Endpoints

#### Authentication
```bash
# Admin kullanıcısı oluştur
POST http://localhost:5001/api/auth/create-admin

# Login
POST http://localhost:5000/api/auth/login

# Kullanıcı listesi (Admin)
GET http://localhost:5001/api/auth/users
```

#### AI Operations
```bash
# Anahtar kelime çıkarma
POST http://localhost:5000/api/gemini/extract-keywords

# Dava analizi
POST http://localhost:5000/api/gemini/analyze-case

# Dilekçe oluşturma
POST http://localhost:5000/api/gemini/generate-petition
```

#### Search Operations
```bash
# Yargıtay kararı arama
POST http://localhost:5000/api/search

# Arama geçmişi
GET http://localhost:5000/api/search/history
```

### Health Checks
```bash
# Tüm servisler
curl http://localhost:5000/health  # API Gateway
curl http://localhost:5001/health  # Identity Service
curl http://localhost:5002/health  # Subscription Service
curl http://localhost:5012/health  # AI Service
curl http://localhost:5043/health  # Search Service
```

### Automated Test Script
Local environment'ı test etmek için hazır script:
```bash
./test-local.sh
```

## 🗄️ Database Management

### Otomatik Database Oluşturma
Production deployment sırasında 5 database otomatik oluşturulur:
- `yargisalzeka` - Ana database
- `IdentityDb` - Kullanıcı bilgileri
- `SubscriptionDb` - Abonelik verileri
- `DocumentDb` - Doküman verileri
- `AIDb` - AI servis verileri

### Manual Migration (Eski Yöntem)
```bash
cd IdentityService
dotnet ef migrations add InitialIdentitySchema -c IdentityDbContext
dotnet ef database update -c IdentityDbContext
```

## 🔧 Development Tools

### Docker Commands
```bash
# Servisleri başlat
docker-compose up -d

# Logları takip et
docker-compose logs -f

# Servis durumunu kontrol et
docker-compose ps

# Servisleri durdur
docker-compose down
```

### Database Connection
```bash
# PostgreSQL'e bağlan
docker exec -it yargisalzeka-postgres psql -U postgres -d yargisalzeka

# Database listesi
\l

# Tablo listesi
\dt
```

## 📊 Monitoring

### Application Metrics
- Tüm servislerde `/health` endpoint'i mevcut
- JWT token validation
- Database connection pooling
- Inter-service REST communication

### Production Deployment
Production deployment için `deploy.sh` script'i kullanın:
```bash
./deploy.sh production
```

Detaylı deployment bilgisi için `PRODUCTION_README.md` dosyasını inceleyin.

## 🤝 Katkı

### Development Guidelines
1. **Branch Strategy**: Feature branch'ler kullanın (`feature/yeni-ozellik`)
2. **Code Quality**: `dotnet build` ve `dotnet test` başarılı olmalı
3. **Documentation**: Yeni API'ler için README güncelleyin
4. **Testing**: Unit test'ler yazın

### Pull Request Process
1. Feature branch'inizi oluşturun
2. Değişikliklerinizi commit edin
3. Testleri çalıştırın
4. Pull request oluşturun
5. Code review'dan geçmesini bekleyin

## 📄 Lisans

Bu proje eğitim ve öğrenme amaçlı oluşturulmuştur. Ticari kullanım için lisans şartları uygulanabilir.

## 📞 Destek

- **Issues**: https://github.com/vlikcc/yargisalzeka-dotnet-microservices/issues
- **Discussions**: GitHub Discussions
- **Email**: velikececi@gmail.com

## 🎯 Roadmap

### ✅ Completed Features
- [x] Microservices architecture
- [x] Google Gemini AI integration
- [x] JWT authentication & role management
- [x] Admin dashboard
- [x] PostgreSQL & OpenSearch integration
- [x] Docker containerization
- [x] Production deployment setup
- [x] Health checks & monitoring

### 🚧 In Progress
- [ ] Advanced analytics dashboard
- [ ] Document template management
- [ ] Multi-language support
- [ ] Mobile app development

### 📋 Planned Features
- [ ] AI model fine-tuning
- [ ] Advanced search filters
- [ ] Bulk operations
- [ ] API rate limiting
- [ ] Backup & recovery automation

---

**🚀 Yargısal Zeka platformu ile güçlü ve modern bir microservices sistemi oluşturduk!**

Herhangi bir sorunuz olursa issue açmaktan çekinmeyin. İyi çalışmalar! 🎉
