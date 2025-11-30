# Yargısal Zeka - Hetzner Deployment Rehberi

Bu rehber, Yargısal Zeka projesini Hetzner Cloud sunucusuna deploy etme adımlarını içerir.

---

## 📋 Gereksinimler

### Minimum Sunucu Özellikleri
- **CPU:** 4 vCPU (önerilen: 8 vCPU)
- **RAM:** 8 GB (önerilen: 16 GB) - Elasticsearch için önemli
- **Disk:** 80 GB SSD (önerilen: 160 GB)
- **OS:** Ubuntu 22.04 LTS

### Önerilen Hetzner Planı
- **CX31** (4 vCPU, 8 GB RAM) - Başlangıç için
- **CX41** (8 vCPU, 16 GB RAM) - Üretim için önerilen

---

## 🚀 Adım 1: Hetzner Sunucu Oluşturma

### 1.1 Hetzner Cloud Console
1. https://console.hetzner.cloud adresine gidin
2. Yeni proje oluşturun veya mevcut projeyi seçin
3. **"Add Server"** butonuna tıklayın

### 1.2 Sunucu Ayarları
```
Location: Nuremberg (nbg1) veya Helsinki (hel1)
Image: Ubuntu 22.04
Type: CX31 veya CX41
SSH Key: Yeni SSH key ekleyin veya mevcut olanı seçin
Name: yargisalzeka-prod
```

### 1.3 SSH Key Oluşturma (Eğer yoksa)
```bash
# Lokal makinenizde
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
# Çıktıyı Hetzner'a ekleyin
```

---

## 🔧 Adım 2: Sunucu Kurulumu

### 2.1 Sunucuya Bağlanma
```bash
ssh root@SUNUCU_IP_ADRESI
```

### 2.2 Sistem Güncelleme
```bash
apt update && apt upgrade -y
apt install -y curl wget git vim htop
```

### 2.3 Docker Kurulumu
```bash
# Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker kurulumu
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Docker servisini başlat
systemctl enable docker
systemctl start docker

# Doğrulama
docker --version
docker compose version
```

### 2.4 Swap Alanı Oluşturma (Elasticsearch için önemli)
```bash
# 4GB swap oluştur
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Kalıcı yap
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

# Swappiness ayarı
echo 'vm.swappiness=10' | tee -a /etc/sysctl.conf
sysctl -p
```

### 2.5 Elasticsearch için Sistem Ayarları
```bash
# Virtual memory limit
echo 'vm.max_map_count=262144' | tee -a /etc/sysctl.conf
sysctl -p

# File descriptors
echo '* soft nofile 65536' | tee -a /etc/security/limits.conf
echo '* hard nofile 65536' | tee -a /etc/security/limits.conf
```

---

## 📦 Adım 3: Proje Deployment

### 3.1 Proje Klasörü Oluşturma
```bash
mkdir -p /opt/yargisalzeka
cd /opt/yargisalzeka
```

### 3.2 Git ile Projeyi Çekme
```bash
git clone https://github.com/vlikcc/yargisalzeka.V2.git .
```

### 3.3 Environment Dosyası Oluşturma
```bash
cat > .env << 'EOF'
# JWT Configuration (Güçlü bir secret key kullanın!)
JWT_KEY=BURAYA_GUCLU_BIR_SECRET_KEY_YAZIN_EN_AZ_32_KARAKTER
JWT_ISSUER=https://api.yourdomain.com
JWT_AUDIENCE=https://yourdomain.com

# PostgreSQL
POSTGRES_PASSWORD=GUCLU_BIR_SIFRE_YAZIN
POSTGRES_USER=postgres
POSTGRES_DB=yargisalzeka

# Gemini API
GEMINI_API_KEY=SIZIN_GEMINI_API_ANAHTARINIZ

# Search Provider
SEARCH_PROVIDER=elasticsearch

# Elasticsearch
Elasticsearch__Uri=http://elasticsearch:9200
Elasticsearch__Index=kararlar

# Production
ASPNETCORE_ENVIRONMENT=Production
EOF
```

### 3.4 Production Docker Compose Dosyası
```bash
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.17.18
    restart: always
    environment:
      - node.name=elasticsearch
      - cluster.name=yargisalzeka-cluster
      - discovery.type=single-node
      - bootstrap.memory_lock=true
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
      - xpack.security.enabled=false
    ulimits:
      memlock:
        soft: -1
        hard: -1
      nofile:
        soft: 65536
        hard: 65536
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s

  identityservice:
    build:
      context: .
      dockerfile: IdentityService/Dockerfile
    restart: always
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=Host=postgres;Database=IdentityDb_prod;Username=${POSTGRES_USER};Password=${POSTGRES_PASSWORD}
      - Jwt__Key=${JWT_KEY}
      - Jwt__Issuer=${JWT_ISSUER}
      - Jwt__Audience=${JWT_AUDIENCE}
    depends_on:
      postgres:
        condition: service_healthy

  subscriptionservice:
    build:
      context: .
      dockerfile: SubscriptionService/Dockerfile
    restart: always
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=Host=postgres;Database=SubscriptionDb_prod;Username=${POSTGRES_USER};Password=${POSTGRES_PASSWORD}
      - Jwt__Key=${JWT_KEY}
      - Jwt__Issuer=${JWT_ISSUER}
      - Jwt__Audience=${JWT_AUDIENCE}
    depends_on:
      postgres:
        condition: service_healthy

  searchservice:
    build:
      context: .
      dockerfile: SearchService/Dockerfile
    restart: always
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=Host=postgres;Database=yargitay_kararlari_prod;Username=${POSTGRES_USER};Password=${POSTGRES_PASSWORD}
      - Jwt__Key=${JWT_KEY}
      - Jwt__Issuer=${JWT_ISSUER}
      - Jwt__Audience=${JWT_AUDIENCE}
      - Search__Provider=elasticsearch
      - Elasticsearch__Uri=http://elasticsearch:9200
      - Elasticsearch__Index=kararlar
    depends_on:
      postgres:
        condition: service_healthy
      elasticsearch:
        condition: service_healthy

  aiservice:
    build:
      context: .
      dockerfile: AIService/Dockerfile
    restart: always
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - Gemini__ApiKey=${GEMINI_API_KEY}
      - SearchService__BaseUrl=http://searchservice:5004
      - Jwt__Key=${JWT_KEY}
      - Jwt__Issuer=${JWT_ISSUER}
      - Jwt__Audience=${JWT_AUDIENCE}
    depends_on:
      - subscriptionservice
      - searchservice

  documentservice:
    build:
      context: .
      dockerfile: DocumentService/Dockerfile
    restart: always
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=Host=postgres;Database=DocumentDb_prod;Username=${POSTGRES_USER};Password=${POSTGRES_PASSWORD}
      - AIService__BaseUrl=http://aiservice:5012
      - Jwt__Key=${JWT_KEY}
      - Jwt__Issuer=${JWT_ISSUER}
      - Jwt__Audience=${JWT_AUDIENCE}
    depends_on:
      postgres:
        condition: service_healthy
      aiservice:
        condition: service_started

  apigateway:
    build:
      context: .
      dockerfile: ApiGateway/Dockerfile
    restart: always
    ports:
      - "5000:5000"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - Jwt__Key=${JWT_KEY}
      - Jwt__Issuer=${JWT_ISSUER}
      - Jwt__Audience=${JWT_AUDIENCE}
    depends_on:
      - identityservice
      - subscriptionservice
      - searchservice
      - aiservice
      - documentservice

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - apigateway

volumes:
  postgres_data:
  elasticsearch_data:
EOF
```

### 3.5 Servisleri Başlatma
```bash
# Build ve başlat
docker compose -f docker-compose.prod.yml up -d --build

# Logları izle
docker compose -f docker-compose.prod.yml logs -f
```

---

## 🗄️ Adım 4: Veritabanı Migration

### 4.1 Elasticsearch Index Oluşturma
```bash
# Elasticsearch'ün hazır olmasını bekle
sleep 60

# Index oluştur
curl -X PUT "http://localhost:9200/kararlar" -H 'Content-Type: application/json' -d @scripts/elasticsearch_kararlar_mapping.json
```

### 4.2 PostgreSQL'den Elasticsearch'e Veri Aktarımı
Eğer mevcut PostgreSQL veritabanınız varsa:
```bash
# Python bağımlılıklarını kur
apt install -y python3-pip
pip3 install psycopg2-binary elasticsearch

# Migration script'ini çalıştır
cd /opt/yargisalzeka/scripts
python3 migrate_to_elasticsearch.py
```

---

## 🌐 Adım 5: Domain ve SSL Ayarları

### 5.1 Nginx Reverse Proxy Kurulumu
```bash
apt install -y nginx certbot python3-certbot-nginx
```

### 5.2 Nginx Konfigürasyonu
```bash
cat > /etc/nginx/sites-available/yargisalzeka << 'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout ayarları (AI işlemleri için)
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF

ln -s /etc/nginx/sites-available/yargisalzeka /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 5.3 SSL Sertifikası (Let's Encrypt)
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

---

## 🔥 Adım 6: Firewall Ayarları

```bash
# UFW kurulumu ve ayarları
apt install -y ufw

ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https

# UFW'yi etkinleştir
ufw enable

# Durumu kontrol et
ufw status
```

---

## 📊 Adım 7: Monitoring ve Bakım

### 7.1 Servis Durumu Kontrolü
```bash
# Tüm container'ları görüntüle
docker compose -f docker-compose.prod.yml ps

# Sağlık kontrolü
curl http://localhost:5000/health
curl http://localhost:9200/_cluster/health
```

### 7.2 Log İzleme
```bash
# Tüm loglar
docker compose -f docker-compose.prod.yml logs -f

# Belirli servis
docker compose -f docker-compose.prod.yml logs -f aiservice
```

### 7.3 Otomatik Yeniden Başlatma Script'i
```bash
cat > /opt/yargisalzeka/restart.sh << 'EOF'
#!/bin/bash
cd /opt/yargisalzeka
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
EOF

chmod +x /opt/yargisalzeka/restart.sh
```

### 7.4 Güncellemeleri Uygulama
```bash
cd /opt/yargisalzeka
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

### 7.5 Yedekleme Script'i
```bash
cat > /opt/yargisalzeka/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# PostgreSQL yedekleme
docker exec yargisalzeka-postgres-1 pg_dumpall -U postgres > $BACKUP_DIR/postgres_backup.sql

# Elasticsearch yedekleme (snapshot)
curl -X PUT "localhost:9200/_snapshot/backup" -H 'Content-Type: application/json' -d '{
  "type": "fs",
  "settings": {
    "location": "/usr/share/elasticsearch/data/backups"
  }
}'

echo "Yedekleme tamamlandı: $BACKUP_DIR"
EOF

chmod +x /opt/yargisalzeka/backup.sh

# Cron job ekle (her gün gece 3'te)
echo "0 3 * * * /opt/yargisalzeka/backup.sh" | crontab -
```

---

## 🔄 Adım 8: CI/CD (Opsiyonel)

### GitHub Actions ile Otomatik Deployment
`.github/workflows/deploy.yml` dosyası oluşturun:

```yaml
name: Deploy to Hetzner

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HETZNER_HOST }}
          username: root
          key: ${{ secrets.HETZNER_SSH_KEY }}
          script: |
            cd /opt/yargisalzeka
            git pull origin main
            docker compose -f docker-compose.prod.yml up -d --build
```

GitHub Secrets'a ekleyin:
- `HETZNER_HOST`: Sunucu IP adresi
- `HETZNER_SSH_KEY`: SSH private key

---

## ✅ Kontrol Listesi

- [ ] Hetzner sunucu oluşturuldu
- [ ] Docker kuruldu
- [ ] Swap alanı oluşturuldu
- [ ] Elasticsearch sistem ayarları yapıldı
- [ ] Proje klonlandı
- [ ] .env dosyası oluşturuldu
- [ ] Docker container'ları başlatıldı
- [ ] Elasticsearch index oluşturuldu
- [ ] Veri migration yapıldı
- [ ] Domain DNS ayarları yapıldı
- [ ] SSL sertifikası alındı
- [ ] Firewall ayarları yapıldı
- [ ] Yedekleme script'i oluşturuldu

---

## 🆘 Sorun Giderme

### Elasticsearch başlamıyor
```bash
# Logları kontrol et
docker compose -f docker-compose.prod.yml logs elasticsearch

# Memory lock hatası için
sysctl -w vm.max_map_count=262144
```

### Container'lar sürekli restart ediyor
```bash
# Detaylı log
docker compose -f docker-compose.prod.yml logs --tail=100 SERVIS_ADI
```

### Disk doluluk kontrolü
```bash
df -h
docker system prune -a  # Kullanılmayan image'ları temizle
```

---

## 📞 Destek

Sorun yaşarsanız:
1. `docker compose logs` ile logları kontrol edin
2. Sistem kaynaklarını `htop` ile izleyin
3. GitHub Issues'da sorun bildirin

