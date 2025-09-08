-- Enable required extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add generated tsvector column (if not exists pattern via DO block)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kararlar' AND column_name = 'search_vector'
    ) THEN
        ALTER TABLE kararlar
            ADD COLUMN search_vector tsvector
            GENERATED ALWAYS AS (
                to_tsvector('turkish', 
                    coalesce(yargitay_dairesi,'') || ' ' ||
                    coalesce(esas_no,'') || ' ' ||
                    coalesce(karar_no,'') || ' ' ||
                    coalesce(karar_metni,'')
                )
            ) STORED;
    END IF;
END$$;

-- Create GIN index (CONCURRENTLY cannot run inside DO/transaction block)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kararlar_search_vector ON kararlar USING GIN (search_vector);

-- Optional trigram index (fuzzy/prefix search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kararlar_karar_metni_trgm ON kararlar USING GIN (karar_metni gin_trgm_ops);

-- VACUUM ANALYZE to update stats (optional; can be run off-peak)
-- VACUUM (ANALYZE) kararlar;

-- Test query example (uncomment to verify):
-- EXPLAIN ANALYZE SELECT id FROM kararlar WHERE search_vector @@ plainto_tsquery('turkish','miras iptal');
