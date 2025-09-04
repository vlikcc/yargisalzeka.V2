# Yargısal Zeka Microservices - Production Deployment Guide

## 🚀 Production Deployment

Bu kılavuz, Yargısal Zeka microservices'lerinin production ortamına deployment'ı için gerekli adımları içerir.

### 📋 Ön Koşullar

- Docker ve Docker Compose
- Minimum 8GB RAM
- 20GB boş disk alanı
- Linux/Unix tabanlı işletim sistemi (önerilir)

### 🔧 Kurulum Adımları

#### 1. Environment Variables Konfigürasyonu

```bash
# .env.example dosyasını kopyalayın
cp .env.example .env

# .env dosyasını düzenleyin ve gerçek değerleri girin
nano .env
```

**Gerekli Environment Variables:**

```bash
# Database
DB_PASSWORD=your_secure_database_password

# JWT Security
JWT_KEY=your_very_long_and_secure_jwt_key_at_least_32_characters
JWT_ISSUER=https://your-domain.com
JWT_AUDIENCE=https://your-domain.com

# AI Service
GEMINI_API_KEY=your_google_gemini_api_key

# Application
ASPNETCORE_ENVIRONMENT=Production
```

#### 2. SSL/TLS Sertifikaları

Production deployment için SSL sertifikası gereklidir:

```bash
# Let's Encrypt ile ücretsiz SSL sertifikası
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com

# Veya kendi sertifikanızı kullanın
cp /path/to/your/cert.pem ./certs/
cp /path/to/your/key.pem ./certs/
```

#### 3. Database Volumes Konfigürasyonu

```bash
# Production data directories
sudo mkdir -p /data/postgres
sudo mkdir -p /data/opensearch
sudo chown -R 1001:1001 /data/postgres
sudo chown -R 1001:1001 /data/opensearch
```

#### 4. Production Deployment

```bash
# Production deployment script'ini çalıştırın
./deploy.sh production

# Veya manuel deployment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Database migration'ları kontrol edin
./scripts/migrate.sh
```

#### 4.1 Veritabanı Otomatik Oluşturma

**Production'da veritabanları otomatik olarak oluşturulur:**

- ✅ **PostgreSQL Databases**: İlk başlatmada otomatik oluşturulur
  - `IdentityDb` - Kullanıcı ve kimlik bilgileri
  - `SubscriptionDb` - Abonelik bilgileri
  - `DocumentDb` - Doküman ve dilekçe verileri
  - `yargitay_kararlari` - Yargıtay kararları
  - `AIDb` - AI servis verileri

- ✅ **Tablolar**: Her servis kendi tablolarını otomatik oluşturur
  - IdentityService: ASP.NET Identity tabloları
  - SearchService: Arama ve karar tabloları
  - DocumentService: Doküman ve dilekçe tabloları
  - SubscriptionService: Abonelik tabloları

- ✅ **İlk Admin Kullanıcı**: Sistemde admin yoksa otomatik oluşturulur

**Migration Yaklaşımı:**
- Development: `Database.EnsureCreated()` - Hızlı geliştirme
- Production: Migration scripts - Güvenli ve versiyonlanabilir

#### 5. Reverse Proxy (Nginx) Konfigürasyonu

```nginx
# /etc/nginx/sites-available/yargisalzeka.conf
server {
    listen 80;
    server_name your-domain.com;

    # HTTP to HTTPS redirect
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Gateway
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check (internal)
    location /health {
        proxy_pass http://localhost:5000/health;
        access_log off;
    }
}
```

### 🔍 Monitoring ve Logging

#### Health Checks
Tüm servisler `/health` endpoint'i üzerinden health check desteği sağlar:

```bash
# Manuel health check
curl http://localhost:5000/health
curl http://localhost:5001/health
curl http://localhost:5012/health
```

#### Log Aggregation
Production log'lar Docker log'larında toplanır:

```bash
# Servis loglarını görüntüleme
docker-compose logs -f api-gateway
docker-compose logs -f ai-service

# Tüm logları görüntüleme
docker-compose logs --tail=100
```

### 🔒 Güvenlik Konfigürasyonu

#### Firewall Rules
```bash
# UFW ile firewall konfigürasyonu
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
sudo ufw enable

# Veya iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
```

#### Secrets Management
Hassas verileri environment variables yerine Docker secrets kullanın:

```bash
# Docker secret oluşturma
echo "your_secret_password" | docker secret create db_password -
echo "your_jwt_key" | docker secret create jwt_key -
```

### 📊 Performance Optimization

#### Database Tuning
PostgreSQL için production optimizasyonları `docker-compose.prod.yml`'de konfigüre edilmiştir.

#### Resource Limits
Her servis için CPU ve memory limitleri belirlenmiştir.

#### Caching
Redis entegrasyonu için environment variables ekleyin:
```bash
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your_redis_password
```

### 🚨 Troubleshooting

#### Servis Başlatma Sorunları
```bash
# Servis durumunu kontrol et
docker-compose ps

# Belirli servis loglarını görüntüle
docker-compose logs service-name

# Servisleri yeniden başlat
docker-compose restart service-name
```

#### Database Connection Issues
```bash
# Database'e manuel bağlan
docker exec -it yargisalzeka-postgres psql -U postgres -d yargisalzeka

# Database health check
docker exec yargisalzeka-postgres pg_isready -U postgres
```

#### Memory Issues
```bash
# Memory kullanımını kontrol et
docker stats

# Servisleri yeniden başlat
docker-compose down
docker-compose up -d
```

### 🔄 Backup ve Recovery

#### Database Backup
```bash
# Otomatik backup script'i
#!/bin/bash
BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d_%H%M%S)
docker exec yargisalzeka-postgres pg_dumpall -U postgres > $BACKUP_DIR/backup_$DATE.sql
```

#### Data Restore
```bash
# Backup'dan geri yükleme
docker exec -i yargisalzeka-postgres psql -U postgres < backup_file.sql
```

### 📈 Monitoring Tools

Production monitoring için önerilen araçlar:

1. **Prometheus + Grafana**: Metrics monitoring
2. **ELK Stack**: Log aggregation
3. **cAdvisor**: Container monitoring
4. **Portainer**: Docker management UI

### 🚀 Zero-Downtime Deployment

```bash
# Rolling update
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps service-name

# Health check ile doğrulama
curl -f http://localhost:5000/health || exit 1
```

### 📞 Destek

Herhangi bir sorun yaşarsanız:

1. Servis loglarını kontrol edin: `docker-compose logs`
2. Health check endpoint'lerini test edin
3. Sistem kaynaklarını kontrol edin: `docker stats`
4. GitHub Issues'a problem bildirin

---

**🎯 Production Checklist**

- [ ] Environment variables konfigüre edildi
- [ ] SSL/TLS sertifikası kuruldu
- [ ] Firewall konfigüre edildi
- [ ] Database volumes oluşturuldu
- [ ] Veritabanları otomatik oluşturulacak ✅
- [ ] Tablolar otomatik oluşturulacak ✅
- [ ] Migration scripts hazır ✅
- [ ] Backup stratejisi tanımlandı
- [ ] Monitoring araçları kuruldu
- [ ] Health checks test edildi
- [ ] Log rotation konfigüre edildi

**✅ Deployment başarılı!**
