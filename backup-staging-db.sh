#!/bin/bash

echo "💾 Backing up staging database..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists (your current staging config)
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!"
    echo -e "${YELLOW}Please ensure your .env file exists with DATABASE_URL for staging${NC}"
    exit 1
fi

# Source the environment variables
source .env

# Extract database details from DATABASE_URL
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
MYSQL_USER=$(echo $DATABASE_URL | sed -n 's/mysql:\/\/\([^:]*\):.*/\1/p')
MYSQL_PASS=$(echo $DATABASE_URL | sed -n 's/mysql:\/\/[^:]*:\([^@]*\)@.*/\1/p')
MYSQL_HOST=$(echo $DATABASE_URL | sed -n 's/mysql:\/\/[^@]*@\([^:]*\):.*/\1/p')
MYSQL_PORT=$(echo $DATABASE_URL | sed -n 's/mysql:\/\/[^@]*@[^:]*:\([^\/]*\)\/.*/\1/p')

if [ -z "$DB_NAME" ]; then
    echo -e "${RED}❌ Could not extract database name from DATABASE_URL"
    echo -e "${YELLOW}Please ensure DATABASE_URL is in format: mysql://user:pass@host:port/dbname${NC}"
    exit 1
fi

# Create backups directory if it doesn't exist
mkdir -p backups

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backups/staging_backup_${DB_NAME}_${TIMESTAMP}.sql"

echo -e "${BLUE}📊 Backing up database: ${DB_NAME}${NC}"
echo -e "${BLUE}📁 Backup file: ${BACKUP_FILE}${NC}"

# Create the backup
mysqldump -h$MYSQL_HOST -P$MYSQL_PORT -u$MYSQL_USER -p$MYSQL_PASS \
    --routines --triggers --single-transaction --quick --lock-tables=false \
    $DB_NAME > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup completed successfully!${NC}"
    echo -e "${BLUE}📁 Backup saved to: ${BACKUP_FILE}${NC}"
    
    # Show backup file size
    BACKUP_SIZE=$(du -h $BACKUP_FILE | cut -f1)
    echo -e "${BLUE}📊 Backup size: ${BACKUP_SIZE}${NC}"
    
    # Compress the backup
    echo -e "${BLUE}🗜️  Compressing backup...${NC}"
    gzip $BACKUP_FILE
    
    COMPRESSED_SIZE=$(du -h ${BACKUP_FILE}.gz | cut -f1)
    echo -e "${GREEN}✅ Backup compressed to: ${BACKUP_FILE}.gz (${COMPRESSED_SIZE})${NC}"
    
    echo -e "${BLUE}💡 To restore this backup later:${NC}"
    echo -e "   gunzip ${BACKUP_FILE}.gz"
    echo -e "   mysql -h[host] -u[user] -p[database_name] < ${BACKUP_FILE}"
else
    echo -e "${RED}❌ Backup failed!${NC}"
    echo -e "${YELLOW}Please check your database credentials and connectivity${NC}"
    exit 1
fi
