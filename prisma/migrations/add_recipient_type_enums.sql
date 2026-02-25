-- Add new RecipientType enum values for student messaging (production-safe, no data loss).
-- Run this against your production DB, then run: pnpm prisma generate
--
-- Usage (replace with your connection details):
--   mysql -h YOUR_HOST -u YOUR_USER -p YOUR_DATABASE < prisma/migrations/add_recipient_type_enums.sql
-- Or run the ALTER below in your MySQL client.

-- MySQL requires redefining the full ENUM to add values. Existing values unchanged.
ALTER TABLE `Message`
  MODIFY COLUMN `recipientType` ENUM(
    'STUDENTS',
    'STUDENTS_INCOMPLETE_PERMISSION_SLIP',
    'STUDENTS_NO_PICKS',
    'STUDENTS_FEW_PICKS',
    'STUDENTS_FEW_SLOTS',
    'STUDENTS_EMAIL_UNVERIFIED',
    'STUDENTS_EMAIL_VERIFIED_NO_PERMISSION_SLIP',
    'STUDENTS_PERMISSION_SLIP_COMPLETE_NO_PICKS',
    'COMPANIES_ALL',
    'COMPANIES_PUBLISHED',
    'COMPANIES_DRAFT',
    'COMPANIES_NO_POSITION',
    'COMPANIES_STUDENTS_ATTENDING',
    'COMPANIES_ACCOUNT_HOLDERS',
    'POST_LOTTERY_ASSIGNED',
    'POST_LOTTERY_UNASSIGNED',
    'INDIVIDUAL_STUDENT',
    'INDIVIDUAL_COMPANY'
  ) NOT NULL;
