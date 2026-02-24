-- AlterTable
-- Expand Position text fields from 1024 to 2048 chars (non-destructive: no data loss).
-- Existing values remain valid; only the maximum allowed length increases.
ALTER TABLE `Position` MODIFY COLUMN `summary` VARCHAR(2048) NOT NULL,
MODIFY COLUMN `address` VARCHAR(2048) NOT NULL,
MODIFY COLUMN `instructions` VARCHAR(2048) NOT NULL,
MODIFY COLUMN `attire` VARCHAR(2048) NOT NULL;
