# Docker ile Yargısal Zeka Mikroservisleri

## Hızlı Başlangıç

### 1. Tüm Servisleri Başlat
```bash
docker-compose up -d
```

### 2. Servisleri Durdur
```bash
docker-compose down
```

### 3. Logları İzle
```bash
docker-compose logs -f
```

## Servis Portları

| Servis | Port | Swagger UI |
|--------|------|------------|
| IdentityService | 5001 | http://localhost:5001/swagger |
| SubscriptionService | 5002 | http://localhost:5002/swagger |
| AIService | 5012 | http://localhost:5012/swagger |
| SearchService | 5043 | http://localhost:5043/swagger |
| PostgreSQL | 5432 | - |
| OpenSearch | 9200 | - |

## Veritabanı Kurulumu

### PostgreSQL Veritabanları Oluştur
```bash
# IdentityDb oluştur
docker exec yargisalzeka-postgres psql -U postgres -c "CREATE DATABASE \"IdentityDb\";"

# SubscriptionDb oluştur
docker exec yargisalzeka-postgres psql -U postgres -c "CREATE DATABASE \"SubscriptionDb\";"


```

## Test

### 1. Servislerin Çalıştığını Kontrol Et
```bash
# Health check
curl http://localhost:5001/health
curl http://localhost:5002/health
curl http://localhost:5012/health
curl http://localhost:5043/health
```

### 2. SearchService Test
```bash
curl -X POST http://localhost:5043/api/search \
  -H 'Content-Type: application/json' \
  -d '{"keywords":["boşanma","tazminat"]}'
```

### 3. AIService → SearchService Test
```bash
curl -X POST http://localhost:5012/api/gemini/search-decisions \
  -H 'Content-Type: application/json' \
  -d '{"keywords":["boşanma","tazminat"]}'
```

## OpenSearch Kullanımı

### 1. OpenSearch'e Veri Aktar
```bash
curl -X POST http://localhost:5043/api/admin/reindex
```

### 2. SearchService'i OpenSearch'e Geçir
`SearchService/appsettings.json` dosyasında:
```json
{
  "Search": {
    "Provider": "opensearch"
  }
}
```

## Sorun Giderme

### 1. Container Logları
```bash
# Belirli servisin logları
docker-compose logs identity-service
docker-compose logs search-service
```

### 2. Container Durumu
```bash
docker-compose ps
```

### 3. Veritabanı Bağlantısı
```bash
docker exec -it yargisalzeka-postgres psql -U postgres -d IdentityDb
```

### 4. Servisleri Yeniden Başlat
```bash
docker-compose restart
```

## Geliştirme

### 1. Kod Değişikliklerini Yansıt
```bash
docker-compose build
docker-compose up -d
```

### 2. Sadece Belirli Servisi Yeniden Build Et
```bash
docker-compose build search-service
docker-compose up -d search-service
```

## Environment Variables

Tüm environment variable'lar `docker-compose.yml` dosyasında tanımlanmıştır:

- `POSTGRES_PASSWORD`: Srmn1931
- `JWT_KEY`: a4e2f8c1b6d0e8f3a2c5b4d1e6f0a3b7
- `GEMINI_API_KEY`: AIzaSyD5tpzdgEoDPZy_Xs07R8MutzpG6pWvMyo

## Notlar

- İlk çalıştırmada container'lar build edilir (5-10 dakika)
- PostgreSQL ve OpenSearch verileri volume'larda saklanır
- Servisler birbirini container isimleri ile bulur
- Development ortamı için optimize edilmiştir
