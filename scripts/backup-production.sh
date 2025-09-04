#!/bin/bash

# Production Database Backup Script
# This script backs up your existing yargisal_zeka database before starting development

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/yargisal_zeka_backup_$TIMESTAMP.sql"

echo "🗄️  Production Database Backup Script"
echo "====================================="

# Create backups directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🔍 Checking PostgreSQL container..."
if ! docker ps | grep -q yargisalzeka-postgres; then
    echo "❌ PostgreSQL container is not running"
    echo "Please start the services first: docker-compose up -d postgres"
    exit 1
fi

echo "📋 Listing existing databases..."
docker exec yargisalzeka-postgres psql -U postgres -l

echo ""
echo "⚠️  Yedeklenecek veritabanlarını kontrol edin:"
echo "   - yargisal_zeka (production database)"
echo ""

read -p "Yedeklemeye devam etmek istiyor musunuz? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Yedekleme iptal edildi"
    exit 0
fi

echo "💾 Production veritabanı yedekleniyor..."
echo "Yedekleme dosyası: $BACKUP_FILE"

# Backup the production database
docker exec yargisalzeka-postgres pg_dump -U postgres yargisal_zeka > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Production veritabanı başarıyla yedeklendi!"
    echo "📁 Yedekleme dosyası: $BACKUP_FILE"

    # Get file size
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "📊 Yedekleme boyutu: $FILE_SIZE"

    echo ""
    echo "🔄 Development veritabanları oluşturulacak:"
    echo "   - yargisalzeka_dev (ana development database)"
    echo "   - IdentityDb_dev"
    echo "   - SubscriptionDb_dev"
    echo "   - DocumentDb_dev"
    echo "   - yargitay_kararlari_dev"
    echo "   - AIDb_dev"

    echo ""
    echo "🚀 Şimdi development environment'ı başlatabilirsiniz:"
    echo "   docker-compose up -d"

else
    echo "❌ Yedekleme başarısız!"
    exit 1
fi

echo ""
echo "💡 İpuçları:"
echo "   - Production verileriniz güvende: $BACKUP_FILE"
echo "   - Development veritabanları '_dev' son eki ile oluşturulacak"
echo "   - Production ve development aynı PostgreSQL instance'ında çalışacak"
echo "   - Farklı port kullanmak isterseniz docker-compose.override.yml'i düzenleyin"

echo ""
echo "🎉 Yedekleme tamamlandı! Artık development'e geçebilirsiniz."
