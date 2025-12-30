#!/bin/bash

# Configuration
DB_CONTAINER="yargisalzeka-postgres-1" # Try to guess, or use docker compose exec
DB_USER="postgres"
DB_NAME="IdentityDb_prod"

# If running via docker compose
COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

echo "🛠️  Fixing Database Schema for IdentityService..."

# Check if postgres container is running
if ! $COMPOSE_CMD ps | grep -q "postgres"; then
    echo "❌ Postgres container is not running!"
    exit 1
fi

# Function to execute SQL
exec_sql() {
    local sql=$1
    echo "Executing: $sql"
    $COMPOSE_CMD exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "$sql"
}

# Add columns if they don't exist
# We use 'IF NOT EXISTS' to be safe (requires Postgres 9.6+, we have 15)

echo "Adding 'FirstName' column..."
exec_sql 'ALTER TABLE "AspNetUsers" ADD COLUMN IF NOT EXISTS "FirstName" text DEFAULT '\'''\'';'

echo "Adding 'LastName' column..."
exec_sql 'ALTER TABLE "AspNetUsers" ADD COLUMN IF NOT EXISTS "LastName" text DEFAULT '\'''\'';'

echo "Adding 'CreatedAt' column..."
exec_sql 'ALTER TABLE "AspNetUsers" ADD COLUMN IF NOT EXISTS "CreatedAt" timestamp with time zone DEFAULT NOW();'

echo "Adding 'LastLoginAt' column..."
exec_sql 'ALTER TABLE "AspNetUsers" ADD COLUMN IF NOT EXISTS "LastLoginAt" timestamp with time zone NULL;'

echo "Adding 'IsActive' column..."
exec_sql 'ALTER TABLE "AspNetUsers" ADD COLUMN IF NOT EXISTS "IsActive" boolean DEFAULT TRUE;'

echo "Adding 'Role' column..."
exec_sql 'ALTER TABLE "AspNetUsers" ADD COLUMN IF NOT EXISTS "Role" text DEFAULT '\''User'\'';'

echo "Adding 'SubscriptionEndDate' column..."
exec_sql 'ALTER TABLE "AspNetUsers" ADD COLUMN IF NOT EXISTS "SubscriptionEndDate" timestamp with time zone NULL;'

echo "Checking 'LoginLogs' table existence..."
# Create LoginLogs table if not exists (Basic schema)
exec_sql 'CREATE TABLE IF NOT EXISTS "LoginLogs" (
    "Id" bigserial NOT NULL,
    "UserId" text NOT NULL,
    "Email" text NOT NULL,
    "IsSuccess" boolean NOT NULL,
    "FailureReason" text NULL,
    "IpAddress" text NULL,
    "UserAgent" text NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    CONSTRAINT "PK_LoginLogs" PRIMARY KEY ("Id")
);'

echo "Checking 'Announcements' table existence..."
# Create Announcements table if not exists
exec_sql 'CREATE TABLE IF NOT EXISTS "Announcements" (
    "Id" bigserial NOT NULL,
    "Title" text NOT NULL,
    "Content" text NOT NULL,
    "Type" text NOT NULL,
    "IsActive" boolean NOT NULL,
    "ShowOnDashboard" boolean NOT NULL,
    "StartDate" timestamp with time zone NULL,
    "EndDate" timestamp with time zone NULL,
    "CreatedAt" timestamp with time zone NOT NULL,
    "CreatedBy" text NOT NULL,
    "UpdatedAt" timestamp with time zone NULL,
    CONSTRAINT "PK_Announcements" PRIMARY KEY ("Id")
);'

echo "✅ Database schema fix completed successfully!"
