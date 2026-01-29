#!/bin/bash

echo "🔄 Restoring staging backup to production database..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo -e "${YELLOW}Please ensure your .env file exists with DATABASE_URL pointing to production${NC}"
    exit 1
fi

# Source the environment variables
source .env

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not found in .env${NC}"
    exit 1
fi

# Extract database details from DATABASE_URL
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
MYSQL_USER=$(echo $DATABASE_URL | sed -n 's/mysql:\/\/\([^:]*\):.*/\1/p')
MYSQL_PASS=$(echo $DATABASE_URL | sed -n 's/mysql:\/\/[^:]*:\([^@]*\)@.*/\1/p')
MYSQL_HOST=$(echo $DATABASE_URL | sed -n 's/mysql:\/\/[^@]*@\([^:]*\):.*/\1/p')
MYSQL_PORT=$(echo $DATABASE_URL | sed -n 's/mysql:\/\/[^@]*@[^:]*:\([^\/]*\)\/.*/\1/p')

# Default port to 3306 if not specified
if [ -z "$MYSQL_PORT" ]; then
    MYSQL_PORT=3306
fi

if [ -z "$DB_NAME" ]; then
    echo -e "${RED}❌ Could not extract database name from DATABASE_URL${NC}"
    echo -e "${YELLOW}Please ensure DATABASE_URL is in format: mysql://user:pass@host:port/dbname${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: This will DELETE ALL DATA in production database: ${DB_NAME}${NC}"
echo -e "${YELLOW}⚠️  Target: ${MYSQL_HOST}:${MYSQL_PORT}/${DB_NAME}${NC}"
read -p "Type 'YES' to confirm: " confirm

if [ "$confirm" != "YES" ]; then
    echo -e "${RED}❌ Restore cancelled${NC}"
    exit 1
fi

# Find latest backup
LATEST_BACKUP=$(ls -t backups/staging_backup_*.sql.gz 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo -e "${RED}❌ No backup files found in backups/ directory${NC}"
    exit 1
fi

echo -e "${BLUE}📁 Using backup: ${LATEST_BACKUP}${NC}"

# Step 1: Push Prisma schema to ensure database structure is current
echo -e "${BLUE}📊 Step 1: Pushing Prisma schema to production...${NC}"
pnpm prisma db push --accept-data-loss

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to push Prisma schema${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prisma schema pushed successfully${NC}"

# Step 2: Drop all tables to clear existing data
echo -e "${BLUE}🗑️  Step 2: Dropping all tables to clear existing data...${NC}"

# Get list of tables
TABLES=$(mysql -h$MYSQL_HOST -P$MYSQL_PORT -u$MYSQL_USER -p$MYSQL_PASS $DB_NAME -sN -e "SHOW TABLES;" 2>/dev/null)

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to connect to database or get table list${NC}"
    echo -e "${YELLOW}Please check your database credentials${NC}"
    exit 1
fi

if [ -n "$TABLES" ]; then
    # Disable foreign key checks
    mysql -h$MYSQL_HOST -P$MYSQL_PORT -u$MYSQL_USER -p$MYSQL_PASS $DB_NAME -e "SET FOREIGN_KEY_CHECKS = 0;" 2>/dev/null
    
    # Drop each table
    for TABLE in $TABLES; do
        echo -e "${BLUE}   Dropping table: ${TABLE}${NC}"
        mysql -h$MYSQL_HOST -P$MYSQL_PORT -u$MYSQL_USER -p$MYSQL_PASS $DB_NAME -e "DROP TABLE IF EXISTS \`${TABLE}\`;" 2>/dev/null
    done
    
    # Re-enable foreign key checks
    mysql -h$MYSQL_HOST -P$MYSQL_PORT -u$MYSQL_USER -p$MYSQL_PASS $DB_NAME -e "SET FOREIGN_KEY_CHECKS = 1;" 2>/dev/null
    
    echo -e "${GREEN}✅ All tables dropped successfully${NC}"
else
    echo -e "${YELLOW}⚠️  No tables found to drop${NC}"
fi

# Step 3: Restore the backup
echo -e "${BLUE}📥 Step 3: Restoring backup data...${NC}"

# Unzip and restore
gunzip -c "$LATEST_BACKUP" | mysql -h$MYSQL_HOST -P$MYSQL_PORT -u$MYSQL_USER -p$MYSQL_PASS $DB_NAME

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup restored successfully!${NC}"
    echo -e "${BLUE}📊 Database: ${DB_NAME}${NC}"
    echo -e "${BLUE}📁 Source: ${LATEST_BACKUP}${NC}"
else
    echo -e "${RED}❌ Backup restore failed!${NC}"
    exit 1
fi

# Step 4: Run Prisma generate to ensure client is up to date
echo -e "${BLUE}🔄 Step 4: Generating Prisma client...${NC}"
pnpm prisma generate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Prisma client generated successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: Prisma generate had issues, but restore completed${NC}"
fi

echo -e "${GREEN}✅ Restore complete! Production database now has staging data.${NC}"




