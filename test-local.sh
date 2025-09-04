#!/bin/bash

# Local Development Test Script
# Bu script local environment'ın düzgün çalıştığını test eder

set -e

echo "🧪 Local Development Environment Test Script"
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if Docker is running
echo "🔍 Checking prerequisites..."
docker --version > /dev/null 2>&1
print_status $? "Docker is installed"

docker-compose --version > /dev/null 2>&1
print_status $? "Docker Compose is installed"

# Check if services are running
echo ""
echo "🔍 Checking service status..."
if docker-compose ps | grep -q "Up"; then
    print_status 0 "Docker services are running"
else
    print_warning "Docker services may not be running. Run: docker-compose up -d"
fi

# Health Check Tests
echo ""
echo "🏥 Health Check Tests..."

# API Gateway Health Check
echo "Testing API Gateway..."
if curl -s -f http://localhost:5000/health > /dev/null 2>&1; then
    print_status 0 "API Gateway is healthy"
else
    print_status 1 "API Gateway is not responding"
fi

# Identity Service Health Check
echo "Testing Identity Service..."
if curl -s -f http://localhost:5001/health > /dev/null 2>&1; then
    print_status 0 "Identity Service is healthy"
else
    print_status 1 "Identity Service is not responding"
fi

# Subscription Service Health Check
echo "Testing Subscription Service..."
if curl -s -f http://localhost:5002/health > /dev/null 2>&1; then
    print_status 0 "Subscription Service is healthy"
else
    print_status 1 "Subscription Service is not responding"
fi

# AI Service Health Check
echo "Testing AI Service..."
if curl -s -f http://localhost:5012/health > /dev/null 2>&1; then
    print_status 0 "AI Service is healthy"
else
    print_status 1 "AI Service is not responding"
fi

# Search Service Health Check
echo "Testing Search Service..."
if curl -s -f http://localhost:5043/health > /dev/null 2>&1; then
    print_status 0 "Search Service is healthy"
else
    print_status 1 "Search Service is not responding"
fi

# Database Connection Test
echo ""
echo "🗄️  Database Tests..."

# PostgreSQL Connection Test
echo "Testing PostgreSQL connection..."
if docker exec yargisalzeka-postgres pg_isready -U postgres > /dev/null 2>&1; then
    print_status 0 "PostgreSQL is accessible"
else
    print_status 1 "PostgreSQL connection failed"
fi

# Database List Check
echo "Checking databases..."
DB_LIST=$(docker exec yargisalzeka-postgres psql -U postgres -lqt 2>/dev/null | awk '{print $1}' | grep -v '^$' | grep -E '^(yargisalzeka|IdentityDb|SubscriptionDb|DocumentDb| AIDb)$' | wc -l)
if [ "$DB_LIST" -ge 3 ]; then
    print_status 0 "Required databases exist ($DB_LIST found)"
else
    print_status 1 "Some databases are missing (found: $DB_LIST, expected: 5)"
fi

# OpenSearch Test
echo ""
echo "🔍 Search Engine Tests..."

echo "Testing OpenSearch..."
if curl -s -f http://localhost:9200/_cluster/health > /dev/null 2>&1; then
    print_status 0 "OpenSearch is accessible"
else
    print_status 1 "OpenSearch connection failed"
fi

# API Endpoint Tests (requires authentication)
echo ""
echo "🔐 API Endpoint Tests..."

# Create test admin user if it doesn't exist
echo "Creating test admin user..."
CREATE_ADMIN_RESPONSE=$(curl -s -X POST http://localhost:5001/api/auth/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testadmin@test.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "Admin"
  }' 2>/dev/null)

if echo "$CREATE_ADMIN_RESPONSE" | grep -q "SuperAdmin kullanıcısı başarıyla oluşturuldu"; then
    print_status 0 "Test admin user created successfully"
elif echo "$CREATE_ADMIN_RESPONSE" | grep -q "Admin kullanıcısı zaten mevcut"; then
    print_status 0 "Test admin user already exists"
else
    print_status 1 "Failed to create test admin user"
fi

# Login test
echo "Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testadmin@test.com",
    "password": "Test123!"
  }' 2>/dev/null)

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    print_status 0 "Login successful"

    # Extract token for further tests
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

    # Test AI endpoint
    echo "Testing AI endpoint..."
    AI_RESPONSE=$(curl -s -X POST http://localhost:5000/api/gemini/extract-keywords \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"caseText": "Test dava metni"}' 2>/dev/null)

    if echo "$AI_RESPONSE" | grep -q "keywords"; then
        print_status 0 "AI endpoint is working"
    else
        print_status 1 "AI endpoint failed"
    fi

    # Test admin stats
    echo "Testing admin stats..."
    ADMIN_RESPONSE=$(curl -s -X GET http://localhost:5001/api/auth/admin-stats \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null)

    if echo "$ADMIN_RESPONSE" | grep -q "totalUsers"; then
        print_status 0 "Admin stats endpoint is working"
    else
        print_status 1 "Admin stats endpoint failed"
    fi

else
    print_status 1 "Login failed"
fi

# Frontend Test (if running)
echo ""
echo "🎨 Frontend Tests..."

if curl -s -f http://localhost:5173 > /dev/null 2>&1; then
    print_status 0 "Frontend is running on port 5173"
else
    print_warning "Frontend may not be running. Run: cd frontend && npm run dev"
fi

# Summary
echo ""
echo "📊 Test Summary"
echo "=============="

SERVICES=("API Gateway" "Identity Service" "Subscription Service" "AI Service" "Search Service")
PORTS=(5000 5001 5002 5012 5043)
ALL_HEALTHY=true

echo "Service Health Status:"
for i in "${!SERVICES[@]}"; do
    if curl -s -f "http://localhost:${PORTS[$i]}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ${SERVICES[$i]} (Port ${PORTS[$i]}) - Healthy${NC}"
    else
        echo -e "${RED}❌ ${SERVICES[$i]} (Port ${PORTS[$i]}) - Unhealthy${NC}"
        ALL_HEALTHY=false
    fi
done

echo ""
if [ "$ALL_HEALTHY" = true ]; then
    echo -e "${GREEN}🎉 Tüm servisler sağlıklı! Local development environment hazır.${NC}"
else
    echo -e "${RED}⚠️  Bazı servisler çalışmıyor. Sorunları çözmek için LOCAL_DEVELOPMENT.md dosyasını inceleyin.${NC}"
fi

echo ""
echo "🔧 Troubleshooting Tips:"
echo "1. Servisleri yeniden başlatın: docker-compose restart"
echo "2. Logları kontrol edin: docker-compose logs"
echo "3. Environment variables'ı kontrol edin: cat .env"
echo "4. Port çakışmalarını kontrol edin: netstat -tulpn"
echo "5. Detaylı rehber için: LOCAL_DEVELOPMENT.md"

echo ""
echo "📞 Support:"
echo "- GitHub Issues: https://github.com/vlikcc/yargisalzeka-dotnet-microservices/issues"
echo "- Email: velikececi@gmail.com"

exit 0
