#!/bin/sh
set -e

# This script runs on first init of the postgres data directory
# It will create required databases for microservices.

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
DO $$ BEGIN
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'IdentityDb') THEN
      CREATE DATABASE "IdentityDb";
   END IF;
END $$;
DO $$ BEGIN
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'SubscriptionDb') THEN
      CREATE DATABASE "SubscriptionDb";
   END IF;
END $$;
DO $$ BEGIN
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'DocumentDb') THEN
      CREATE DATABASE "DocumentDb";
   END IF;
END $$;
DO $$ BEGIN
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'SearchDb') THEN
      CREATE DATABASE "SearchDb";
   END IF;
END $$;
DO $$ BEGIN
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'yargitay_kararlari') THEN
      CREATE DATABASE "yargitay_kararlari";
   END IF;
END $$;
DO $$ BEGIN
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'AIDb') THEN
      CREATE DATABASE "AIDb";
   END IF;
END $$;
EOSQL

# Optional grants (not strictly needed since owner is postgres)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
GRANT ALL PRIVILEGES ON DATABASE "IdentityDb" TO postgres;
GRANT ALL PRIVILEGES ON DATABASE "SubscriptionDb" TO postgres;
GRANT ALL PRIVILEGES ON DATABASE "DocumentDb" TO postgres;
GRANT ALL PRIVILEGES ON DATABASE "SearchDb" TO postgres;
GRANT ALL PRIVILEGES ON DATABASE "yargitay_kararlari" TO postgres;
GRANT ALL PRIVILEGES ON DATABASE "AIDb" TO postgres;
EOSQL
