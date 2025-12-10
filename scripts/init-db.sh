#!/bin/bash
# Production Database Initialization Script
# Creates all necessary databases for microservices

set -e

# Function to create database if not exists
create_db_if_not_exists() {
    local db_name=$1
    echo "Checking database: $db_name"
    
    # Check if database exists
    if psql -U "$POSTGRES_USER" -lqt | cut -d \| -f 1 | grep -qw "$db_name"; then
        echo "Database $db_name already exists, skipping..."
    else
        echo "Creating database: $db_name"
        createdb -U "$POSTGRES_USER" "$db_name"
        echo "Database $db_name created successfully"
    fi
}

# Wait for PostgreSQL to be ready
until pg_isready -U "$POSTGRES_USER"; do
    echo "Waiting for PostgreSQL to be ready..."
    sleep 2
done

echo "PostgreSQL is ready. Creating databases..."

# Create all required databases
create_db_if_not_exists "IdentityDb"
create_db_if_not_exists "SubscriptionDb"
create_db_if_not_exists "DocumentDb"
create_db_if_not_exists "SearchDb"
create_db_if_not_exists "yargitay_kararlari"
create_db_if_not_exists "AIDb"

# Production databases (with _prod suffix)
create_db_if_not_exists "IdentityDb_prod"
create_db_if_not_exists "SubscriptionDb_prod"
create_db_if_not_exists "DocumentDb_prod"
create_db_if_not_exists "yargitay_kararlari_prod"

echo "All databases created successfully!"

