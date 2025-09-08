## Arama Provider Seçenekleri

Desteklenen provider değerleri (SEARCH_PROVIDER env veya appsettings `Search:Provider`):

- `postgres`  : Eski ILIKE tabanlı filtreleme (varsayılan, düşük kurulum).
- `fulltext`  : PostgreSQL Full Text (tsvector + GIN). `scripts/postgres_fulltext_migration.sql` uygulanmalı.
- `opensearch`: OpenSearch/Elasticsearch benzeri gelişmiş arama.

### Full Text Geçiş Adımları
1. Migration script çalıştır: `psql -f scripts/postgres_fulltext_migration.sql` (production’da önce yedek al).
2. Servisi `SEARCH_PROVIDER=fulltext` ortam değişkeni ile başlat.
3. Sağlık testi: `EXPLAIN ANALYZE SELECT id FROM kararlar WHERE search_vector @@ plainto_tsquery('turkish','örnek kelime');`

### Performans Notları
- İlk indeks oluşturma tablo boyutuna göre CPU yoğun olabilir; mümkünse düşük trafikte.
- Trigram indeksi (opsiyonel) fuzzy fallback için.
- Çok sık güncellenen metin alanlarında tsvector generated kolonu otomatik güncellenir; ekstra trigger gerekmez.

### Rollback
```
DROP INDEX CONCURRENTLY IF EXISTS idx_kararlar_search_vector;
ALTER TABLE kararlar DROP COLUMN IF EXISTS search_vector;
```

### OpenSearch’e Geçiş
`SEARCH_PROVIDER=opensearch` ve indeks hazır olmalı (`decisions`). Mapping & ingest pipeline için ayrı dokümantasyon eklenebilir.
