#!/bin/bash

echo "🗄️  Setting up event-mgmt-test database..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ .env.local file not found!"
    echo -e "${YELLOW}Please create .env.local with your database connection details."
    echo -e "Example:"
    echo -e "DATABASE_URL=\"mysql://username:password@localhost:3306/event-mgmt-test\""
    echo -e "${NC}"
    exit 1
fi

# Source the environment variables
source .env.local

# Extract database name from DATABASE_URL
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

if [ -z "$DB_NAME" ]; then
    echo -e "${RED}❌ Could not extract database name from DATABASE_URL"
    echo -e "${YELLOW}Please ensure DATABASE_URL is in format: mysql://user:pass@host:port/dbname${NC}"
    exit 1
fi

echo -e "${BLUE}📊 Target database: ${DB_NAME}${NC}"

# Extract MySQL connection details
MYSQL_USER=$(echo $DATABASE_URL | sed -n 's/mysql:\/\/\([^:]*\):.*/\1/p')
MYSQL_PASS=$(echo $DATABASE_URL | sed -n 's/mysql:\/\/[^:]*:\([^@]*\)@.*/\1/p')
MYSQL_HOST=$(echo $DATABASE_URL | sed -n 's/mysql:\/\/[^@]*@\([^:]*\):.*/\1/p')
MYSQL_PORT=$(echo $DATABASE_URL | sed -n 's/mysql:\/\/[^@]*@[^:]*:\([^\/]*\)\/.*/\1/p')

# Create the database if it doesn't exist
echo -e "${BLUE}🔧 Creating database if it doesn't exist...${NC}"
mysql -h$MYSQL_HOST -P$MYSQL_PORT -u$MYSQL_USER -p$MYSQL_PASS -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\`;"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to create database. Please check your MySQL credentials.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database created/verified successfully${NC}"

# Run Prisma migrations
echo -e "${BLUE}🔄 Running Prisma migrations...${NC}"
DATABASE_URL="$DATABASE_URL" pnpm prisma migrate deploy

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Prisma migrations failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Migrations completed successfully${NC}"

# Generate Prisma client
echo -e "${BLUE}⚙️  Generating Prisma client...${NC}"
DATABASE_URL="$DATABASE_URL" pnpm prisma generate

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Prisma client generation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prisma client generated successfully${NC}"

# Run the test data seed
echo -e "${BLUE}🌱 Populating test data...${NC}"
DATABASE_URL="$DATABASE_URL" node prisma/seed-test-data.js

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Test data population failed${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Test database setup completed successfully!${NC}"
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "   1. Update your application's DATABASE_URL to point to: ${DB_NAME}"
echo -e "   2. Start your development server: ${YELLOW}pnpm run dev${NC}"
echo -e "   3. Login with admin credentials to test event management"
echo -e ""
echo -e "${BLUE}🔐 Admin Credentials:${NC}"
echo -e "   📧 hleroy73+admin@gmail.com / Luthje33"
echo -e "   📧 leroy.dave+admin@gmail.com / chestnw3gard"
