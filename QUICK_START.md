# 🚀 Quick Start - Yargısal Zeka Local Setup

Bu rehber ile 5 dakikada local development ortamınızı kurabilirsiniz.

## ⚡ Hızlı Kurulum (5 Adım)

### 1. Gereksinimleri Kontrol Et
```bash
# Docker kurulu mu?
docker --version
docker-compose --version

# .NET SDK kurulu mu?
dotnet --version

# Node.js kurulu mu?
node --version
```

### 2. Projeyi İndir ve Hazırla
```bash
# Repository'yi klonla
git clone https://github.com/vlikcc/yargisalzeka-dotnet-microservices.git
cd yargisalzeka-dotnet-microservices

# Environment dosyasını oluştur
cp .env.example .env
```

### 3. Environment Değerlerini Ayarla
`.env` dosyasını açın ve şu değerleri güncelleyin:

```bash
# Database
DB_PASSWORD=postgres123

# JWT (32+ karakter)
JWT_KEY=bu_cok_gizli_ve_uzun_jwt_key_olacak_123456789
JWT_ISSUER=http://localhost:5000
JWT_AUDIENCE=http://localhost:5000

# AI Service (Google Gemini API key - https://makersuite.google.com/app/apikey)
GEMINI_API_KEY=your_gemini_api_key_here

# Environment
ASPNETCORE_ENVIRONMENT=Development
```

### 4. Servisleri Başlat
```bash
# Tüm servisleri başlat
docker-compose up -d

# Servislerin durumunu kontrol et
docker-compose ps

# Logları takip et
docker-compose logs -f
```

### 5. Test Et
```bash
# Health check
curl http://localhost:5000/health

# Admin kullanıcısı oluştur
curl -X POST http://localhost:5001/api/auth/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin123!",
    "firstName": "Admin",
    "lastName": "User"
  }'

# Login test
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin123!"
  }'
```

## 🎯 Çalışır Durum Kontrolü

✅ **PostgreSQL**: http://localhost:5432
✅ **OpenSearch**: http://localhost:9200
✅ **API Gateway**: http://localhost:5000
✅ **Identity Service**: http://localhost:5001
✅ **Subscription Service**: http://localhost:5002
✅ **AI Service**: http://localhost:5012
✅ **Search Service**: http://localhost:5043

## 🖥️ Frontend Development

```bash
# Frontend klasörüne git
cd frontend

# Dependencies'leri yükle
npm install

# Development server'ı başlat
npm run dev

# http://localhost:5173 adresinde aç
```

## 🔧 Troubleshooting

### Servisler Başlamıyorsa:
```bash
# Logları kontrol et
docker-compose logs

# Servisleri yeniden başlat
docker-compose restart
```

### Port Çakışması:
```bash
# Kullanılan portları kontrol et
netstat -tulpn | grep :5000

# Port'u kullanan process'i durdur
sudo kill -9 <PID>
```

### Database Bağlantı Hatası:
```bash
# PostgreSQL container'ını kontrol et
docker-compose ps postgres

# Yeniden başlat
docker-compose restart postgres
```

## 📊 Detaylı Rehber

Daha detaylı kurulum ve troubleshooting için `LOCAL_DEVELOPMENT.md` dosyasını inceleyin.

---

**🎉 5 dakikada local environment hazır!**
