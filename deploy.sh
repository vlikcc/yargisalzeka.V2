#!/bin/bash

# Production Deployment Script for Yargısal Zeka Microservices
# Usage: ./deploy.sh [environment]

set -euo pipefail

ENVIRONMENT=${1:-production}
COMPOSE_ARGS=("-f" "docker-compose.yml")

if [ "$ENVIRONMENT" = "production" ]; then
    COMPOSE_ARGS+=("-f" "docker-compose.prod.yml")
    echo "🚀 Deploying to PRODUCTION environment"
else
    echo "🧪 Deploying to DEVELOPMENT environment"
fi

# Check if .env file exists
if [ -f .env ]; then
    set -o allexport
    # shellcheck disable=SC1091
    source .env
    set +o allexport
else
    echo "❌ Error: .env file not found!"
    echo "📝 Please create .env file from .env.production.example (production) or .env.development.example (development)"
    exit 1
fi

# Validate required environment variables
REQUIRED_VARS=("DB_PASSWORD" "JWT_KEY" "GEMINI_API_KEY")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: Required environment variable $var is not set!"
        exit 1
    fi
done

echo "🔍 Pulling latest images..."
docker-compose "${COMPOSE_ARGS[@]}" pull || true

echo "🛑 Stopping existing containers..."
docker-compose "${COMPOSE_ARGS[@]}" down

echo "🧹 Cleaning up unused resources..."
docker system prune -f || true

echo "🏗️ Building and starting services..."
docker-compose "${COMPOSE_ARGS[@]}" up -d --build

echo "⏳ Waiting for services to be healthy..."
sleep 30

echo "🔄 Running database migrations..."
./scripts/migrate.sh

echo "🔍 Checking service health..."
docker-compose "${COMPOSE_ARGS[@]}" ps

echo "✅ Deployment completed successfully!"
echo "🌐 Services should be available at:"
echo "  - API Gateway: http://localhost:5161"
echo "  - Frontend: http://localhost:3000"
echo "  - Identity: http://localhost:5030"
echo "  - Search: http://localhost:5043"
echo "  - Document: http://localhost:5144"
echo "  - AI: http://localhost:5012"
echo "  - OpenSearch: http://localhost:9200"
echo "  - PostgreSQL: localhost:5432"
echo "  - Health Check: http://localhost:5161/health"

# Optional: Run health checks
echo "🏥 Running health checks..."
services=("apigateway" "identityservice" "subscriptionservice" "searchservice" "documentservice" "aiservice")

for service in "${services[@]}"; do
    echo "Checking $service..."
    # Add your health check logic here
done

echo "🎉 All services are running!"
