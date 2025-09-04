# Docker Deployment Guide

Bu dosya, Yargısal Zeka microservices projesini Docker ile tek seferde nasıl çalıştıracağınızı açıklar.

## Ön Gereksinimler

- Docker Desktop yüklü olmalı
- Docker Compose yüklü olmalı
- En az 4GB RAM boş alan

## Kurulum Adımları

### 1. Environment Değişkenlerini Ayarlayın

`.env` dosyasını düzenleyin ve gerçek değerleri girin:

```bash
# Database Configuration
DB_PASSWORD=YourSecureDBPassword123!

# JWT Configuration  
JWT_KEY=SuperSecretJwtKeyForProductionUse12345678901234567890

# Gemini AI API Key
GEMINI_API_KEY=your-actual-gemini-api-key-here
```

### 2. Tüm Servisleri Başlatın

```bash
# Tüm servisleri build edip başlat
docker-compose up --build

# Arka planda çalıştırmak için:
docker-compose up --build -d
```

### 3. Servisleri Durdurun

```bash
# Servisleri durdur
docker-compose down

# Volumes'ları da sil (dikkatli olun!)
docker-compose down -v
```

## Servis Portları

| Servis | Port | URL |
|--------|------|-----|
| API Gateway | 5161 | http://localhost:5161 |
| Identity Service | 5030 | http://localhost:5030 |
| Subscription Service | 5229 | http://localhost:5229 |
| AI Service | 5012 | http://localhost:5012 |
| Document Service | 5144 | http://localhost:5144 |
| Search Service | 5043 | http://localhost:5043 |
| PostgreSQL | 5432 | localhost:5432 |
| OpenSearch | 9200 | http://localhost:9200 |

## Health Checks

Tüm servisler health check'lere sahiptir. Servislerin durumunu kontrol etmek için:

```bash
docker-compose ps
```

## Logs

Servislerin loglarını görüntülemek için:

```bash
# Tüm servislerin logları
docker-compose logs

# Belirli bir servisin logları  
docker-compose logs aiservice

# Canlı log takibi
docker-compose logs -f
```

## Troubleshooting

### Servis başlamıyorsa:
1. `.env` dosyasındaki değerleri kontrol edin
2. Docker Desktop'ın çalıştığından emin olun  
3. Port çakışması var mı kontrol edin
4. Logs'u kontrol edin: `docker-compose logs [service-name]`

### Database bağlantı sorunu:
1. PostgreSQL container'ının healthy olduğunu kontrol edin
2. Connection string'leri kontrol edin
3. Firewall ayarlarını kontrol edin

### Memory sorunu:
Docker Desktop'ta memory limitini artırın (Settings > Resources)

## Development Mode

Development için ayrı environment kullanmak isterseniz:

```bash
# Development docker-compose dosyası oluşturun
cp docker-compose.yml docker-compose.dev.yml

# Development mode'da çalıştır
docker-compose -f docker-compose.dev.yml up
```

## Production Deployment

Production için:
1. `.env` dosyasındaki tüm secret'ları güvenli değerlerle değiştirin
2. HTTPS sertifikalarını ekleyin
3. Reverse proxy (nginx) ekleyin
4. Monitoring ve logging ekleyin
5. Backup stratejisi belirleyin
