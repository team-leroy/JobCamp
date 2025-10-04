-- Remove eventEnabled field from Event table
-- This field is redundant since isActive serves the same purpose

ALTER TABLE `Event` DROP COLUMN `eventEnabled`;
