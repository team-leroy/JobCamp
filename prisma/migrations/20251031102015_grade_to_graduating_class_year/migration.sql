-- Migration: Grade to Graduating Class Year
-- Converts student grade (9, 10, 11, 12) to graduating class year (e.g., 2025, 2026, 2027, 2028)
-- Base migration year: March 2025 JobCamp event (2025-03-10)
-- For March 2025 event: Grade 12 = Class of 2025, Grade 11 = Class of 2026, etc.

-- Step 1: Add graduatingClassYear column (nullable initially)
ALTER TABLE `Student` ADD COLUMN `graduatingClassYear` INT NULL;

-- Step 2: Migrate data from grade to graduatingClassYear
-- Formula: graduatingClassYear = 2025 + (12 - grade)
-- This is based on the March 2025 JobCamp event where:
--   Grade 12 (seniors) = Class of 2025
--   Grade 11 (juniors) = Class of 2026
--   Grade 10 (sophomores) = Class of 2027
--   Grade 9 (freshmen) = Class of 2028
UPDATE `Student` 
SET `graduatingClassYear` = 2025 + (12 - `grade`)
WHERE `grade` IS NOT NULL 
  AND `grade` >= 9 
  AND `grade` <= 12;

-- Step 3: Make graduatingClassYear required (after data migration)
-- Note: Any students with invalid grades will need manual fixing
ALTER TABLE `Student` MODIFY COLUMN `graduatingClassYear` INT NOT NULL;

-- Step 4: Remove the old grade column
ALTER TABLE `Student` DROP COLUMN `grade`;

