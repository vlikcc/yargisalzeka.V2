-- Production Database Initialization Script (PostgreSQL)
-- This script creates all necessary databases for the microservices on first container start

-- Helper block to create database if it doesn't exist (PostgreSQL doesn't support IF NOT EXISTS for CREATE DATABASE)
DO $$ BEGIN
	IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'IdentityDb') THEN
		PERFORM dblink_exec('dbname=' || current_database(), 'CREATE DATABASE "IdentityDb"');
	END IF;
EXCEPTION WHEN undefined_function THEN
	-- dblink might not be available; fallback with exception-safe create
	BEGIN
		CREATE DATABASE "IdentityDb";
	EXCEPTION WHEN duplicate_database THEN
		RAISE NOTICE 'Database IdentityDb already exists';
	END;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'SubscriptionDb') THEN
		PERFORM dblink_exec('dbname=' || current_database(), 'CREATE DATABASE "SubscriptionDb"');
	END IF;
EXCEPTION WHEN undefined_function THEN
	BEGIN
		CREATE DATABASE "SubscriptionDb";
	EXCEPTION WHEN duplicate_database THEN
		RAISE NOTICE 'Database SubscriptionDb already exists';
	END;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'DocumentDb') THEN
		PERFORM dblink_exec('dbname=' || current_database(), 'CREATE DATABASE "DocumentDb"');
	END IF;
EXCEPTION WHEN undefined_function THEN
	BEGIN
		CREATE DATABASE "DocumentDb";
	EXCEPTION WHEN duplicate_database THEN
		RAISE NOTICE 'Database DocumentDb already exists';
	END;
END $$;

-- Search database used by SearchService
DO $$ BEGIN
	IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'SearchDb') THEN
		PERFORM dblink_exec('dbname=' || current_database(), 'CREATE DATABASE "SearchDb"');
	END IF;
EXCEPTION WHEN undefined_function THEN
	BEGIN
		CREATE DATABASE "SearchDb";
	EXCEPTION WHEN duplicate_database THEN
		RAISE NOTICE 'Database SearchDb already exists';
	END;
END $$;

-- Legacy/legal decisions database (kept for compatibility)
DO $$ BEGIN
	IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'yargitay_kararlari') THEN
		PERFORM dblink_exec('dbname=' || current_database(), 'CREATE DATABASE "yargitay_kararlari"');
	END IF;
EXCEPTION WHEN undefined_function THEN
	BEGIN
		CREATE DATABASE "yargitay_kararlari";
	EXCEPTION WHEN duplicate_database THEN
		RAISE NOTICE 'Database yargitay_kararlari already exists';
	END;
END $$;

DO $$ BEGIN
	IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'AIDb') THEN
		PERFORM dblink_exec('dbname=' || current_database(), 'CREATE DATABASE "AIDb"');
	END IF;
EXCEPTION WHEN undefined_function THEN
	BEGIN
		CREATE DATABASE "AIDb";
	EXCEPTION WHEN duplicate_database THEN
		RAISE NOTICE 'Database AIDb already exists';
	END;
END $$;

-- Grant permissions to postgres user
GRANT ALL PRIVILEGES ON DATABASE "IdentityDb" TO postgres;
GRANT ALL PRIVILEGES ON DATABASE "SubscriptionDb" TO postgres;
GRANT ALL PRIVILEGES ON DATABASE "DocumentDb" TO postgres;
GRANT ALL PRIVILEGES ON DATABASE "SearchDb" TO postgres;
GRANT ALL PRIVILEGES ON DATABASE "yargitay_kararlari" TO postgres;
GRANT ALL PRIVILEGES ON DATABASE "AIDb" TO postgres;

-- Optional: set timezone for current session (note: not persisted globally here)
SET timezone = 'Europe/Istanbul';
