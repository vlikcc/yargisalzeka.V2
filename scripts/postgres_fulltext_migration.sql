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

-- Create GIN index concurrently (execute separately in production if inside transaction)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename='kararlar' AND indexname='idx_kararlar_search_vector'
    ) THEN
        EXECUTE 'CREATE INDEX CONCURRENTLY idx_kararlar_search_vector ON kararlar USING GIN (search_vector)';
    END IF;
END$$;

-- Optional trigram index for partial/fuzzy fallback (karar_metni)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename='kararlar' AND indexname='idx_kararlar_karar_metni_trgm'
    ) THEN
        EXECUTE 'CREATE INDEX CONCURRENTLY idx_kararlar_karar_metni_trgm ON kararlar USING GIN (karar_metni gin_trgm_ops)';
    END IF;
END$$;

-- VACUUM ANALYZE to update stats (optional; can be run off-peak)
-- VACUUM (ANALYZE) kararlar;

-- Test query example (uncomment to verify):
-- EXPLAIN ANALYZE SELECT id FROM kararlar WHERE search_vector @@ plainto_tsquery('turkish','miras iptal');
