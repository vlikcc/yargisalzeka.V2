-- Development Database Initialization Script (PostgreSQL)
-- This script is intended to run only on a fresh data directory

-- Create development databases (will succeed on first init; volume persists afterwards)
CREATE DATABASE "IdentityDb_dev";
CREATE DATABASE "SubscriptionDb_dev";
CREATE DATABASE "DocumentDb_dev";
CREATE DATABASE "yargitay_kararlari_dev";
CREATE DATABASE "AIDb_dev";

-- Grant permissions to postgres user for development databases
GRANT ALL PRIVILEGES ON DATABASE "IdentityDb_dev" TO postgres;
GRANT ALL PRIVILEGES ON DATABASE "SubscriptionDb_dev" TO postgres;
GRANT ALL PRIVILEGES ON DATABASE "DocumentDb_dev" TO postgres;
GRANT ALL PRIVILEGES ON DATABASE "yargitay_kararlari_dev" TO postgres;
GRANT ALL PRIVILEGES ON DATABASE "AIDb_dev" TO postgres;

-- Set timezone for development session
SET timezone = 'Europe/Istanbul';

-- Note: Extensions and schemas will be created by EF migrations/services at startup
