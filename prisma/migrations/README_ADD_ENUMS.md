# Add new RecipientType enums to production (no migration history)

This adds the 3 new student messaging recipient types to production without using `prisma migrate`. **No data is removed**; only new ENUM values are added.

## Steps

### 1. Run the SQL against production

**Option A – from project root with MySQL CLI**
```bash
mysql -h YOUR_HOST -u YOUR_USER -p YOUR_DATABASE < prisma/migrations/add_recipient_type_enums.sql
```

**Option B – copy/paste in your MySQL client (e.g. Cloud SQL Studio, Workbench, DBeaver)**  
Open `prisma/migrations/add_recipient_type_enums.sql` and run its `ALTER TABLE` statement.

**Option C – Cloud SQL Proxy**
```bash
./cloud-sql-proxy YOUR_PROJECT:REGION:INSTANCE &
mysql -h 127.0.0.1 -u USER -p DATABASE < prisma/migrations/add_recipient_type_enums.sql
```

Replace `YOUR_HOST`, `YOUR_USER`, `YOUR_DATABASE` (and proxy args) with your real connection details.

### 2. If you get "Unknown table 'Message'"

Some setups use lowercase table names. Try changing `Message` to `message` in the SQL file and run again.

### 3. Regenerate Prisma client (already done if you ran `pnpm prisma generate`)

Your schema already has the new enum values, so the client is in sync. After the ALTER runs in the DB, the app can use the new types. No need to run migrate.

### 4. Deploy

Deploy the app as usual. The new code will write the new enum values when admins use the new student messaging options.
