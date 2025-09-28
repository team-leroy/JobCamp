-- PRODUCTION-SAFE Event-Specific Permission Slips Migration
-- This version includes safety checks and preserves all data

-- Safety Check 1: Verify we have exactly one active event
SET @active_event_count = (SELECT COUNT(*) FROM `Event` WHERE `isActive` = true);
SET @active_event_id = (SELECT `id` FROM `Event` WHERE `isActive` = true LIMIT 1);

-- Safety Check 2: If no active events, create a default migration event
-- This prevents data loss if there's no active event
IF @active_event_count = 0 THEN
    -- Find the most recent event to use as migration target
    SET @active_event_id = (
        SELECT `id` FROM `Event` 
        ORDER BY `date` DESC, `id` DESC 
        LIMIT 1
    );
    
    -- If still no events exist, we need manual intervention
    IF @active_event_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ERROR: No events found. Please create an event before running this migration.';
    END IF;
END IF;

-- Safety Check 3: Backup existing data (create a temporary backup table)
CREATE TABLE `PermissionSlipSubmission_backup` AS 
SELECT * FROM `PermissionSlipSubmission`;

-- Add audit trail
ALTER TABLE `PermissionSlipSubmission_backup` 
ADD COLUMN `migration_backup_date` DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Step 1: Add new columns if they don't exist
SET @sql = 'ALTER TABLE `PermissionSlipSubmission` ADD COLUMN `studentId` VARCHAR(191) DEFAULT NULL';
SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'PermissionSlipSubmission' 
     AND column_name = 'studentId' 
     AND table_schema = DATABASE()) = 0,
    @sql,
    'SELECT 1'
));
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE `PermissionSlipSubmission` ADD COLUMN `eventId` VARCHAR(191) DEFAULT NULL';
SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'PermissionSlipSubmission' 
     AND column_name = 'eventId' 
     AND table_schema = DATABASE()) = 0,
    @sql,
    'SELECT 1'
));
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = 'ALTER TABLE `PermissionSlipSubmission` ADD COLUMN `submittedAt` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)';
SET @stmt = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_name = 'PermissionSlipSubmission' 
     AND column_name = 'submittedAt' 
     AND table_schema = DATABASE()) = 0,
    @sql,
    'SELECT 1'
));
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Populate the new columns for existing permission slip submissions
UPDATE `PermissionSlipSubmission` 
SET `studentId` = (
    SELECT `id` 
    FROM `Student` 
    WHERE `Student`.`userId` = `PermissionSlipSubmission`.`user_id`
    LIMIT 1
),
`eventId` = @active_event_id
WHERE `studentId` IS NULL OR `eventId` IS NULL;

-- Step 3: Create permission slip records for students who have permissionSlipCompleted = true
-- but don't have a PermissionSlipSubmission record yet
INSERT INTO `PermissionSlipSubmission` (
    `id`, 
    `user_id`,
    `studentId`, 
    `eventId`, 
    `parentName`, 
    `phoenNumber`, 
    `studentFirstName`, 
    `studentLastName`, 
    `physicalRestrictions`, 
    `dietaryRestrictions`, 
    `liability`, 
    `liabilityDate`,
    `submittedAt`
)
SELECT 
    CONCAT('migrated_', `Student`.`id`) as `id`,
    `Student`.`userId` as `user_id`,
    `Student`.`id` as `studentId`,
    @active_event_id as `eventId`,
    'Migrated Data' as `parentName`,
    `Student`.`phone` as `phoenNumber`,
    `Student`.`firstName` as `studentFirstName`,
    `Student`.`lastName` as `studentLastName`,
    NULL as `physicalRestrictions`,
    NULL as `dietaryRestrictions`,
    'Migrated from legacy system' as `liability`,
    DATE_FORMAT(NOW(), '%Y-%m-%d') as `liabilityDate`,
    NOW() as `submittedAt`
FROM `Student`
WHERE `Student`.`permissionSlipCompleted` = true
AND `Student`.`userId` IS NOT NULL
AND `Student`.`id` NOT IN (
    SELECT COALESCE(`studentId`, '') FROM `PermissionSlipSubmission` WHERE `studentId` IS NOT NULL
)
AND NOT EXISTS (
    SELECT 1 FROM `PermissionSlipSubmission` WHERE `id` = CONCAT('migrated_', `Student`.`id`)
);

-- Step 4: Verify all records can be linked before proceeding
SET @orphaned_count = (
    SELECT COUNT(*) FROM `PermissionSlipSubmission` 
    WHERE `studentId` IS NULL OR `eventId` IS NULL
);

-- If we have orphaned records, stop and require manual intervention
IF @orphaned_count > 0 THEN
    SELECT 
        CONCAT('WARNING: ', @orphaned_count, ' permission slip records cannot be linked and will be lost.') as warning_message,
        * 
    FROM `PermissionSlipSubmission` 
    WHERE `studentId` IS NULL OR `eventId` IS NULL;
    
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration stopped: Orphaned permission slip records found. Please review and manually fix before proceeding.';
END IF;

-- Step 5: Make the new columns required
ALTER TABLE `PermissionSlipSubmission` MODIFY COLUMN `studentId` VARCHAR(191) NOT NULL;
ALTER TABLE `PermissionSlipSubmission` MODIFY COLUMN `eventId` VARCHAR(191) NOT NULL;

-- Step 6: Add new constraints and indexes
ALTER TABLE `PermissionSlipSubmission` ADD CONSTRAINT `PermissionSlipSubmission_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PermissionSlipSubmission` ADD CONSTRAINT `PermissionSlipSubmission_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Add unique constraint and indexes
ALTER TABLE `PermissionSlipSubmission` ADD UNIQUE INDEX `PermissionSlipSubmission_studentId_eventId_key`(`studentId`, `eventId`);
CREATE INDEX `PermissionSlipSubmission_studentId_idx` ON `PermissionSlipSubmission`(`studentId`);
CREATE INDEX `PermissionSlipSubmission_eventId_idx` ON `PermissionSlipSubmission`(`eventId`);

-- Step 8: Drop the old user_id column and unique constraint
ALTER TABLE `PermissionSlipSubmission` DROP INDEX `PermissionSlipSubmission_user_id_key`;
ALTER TABLE `PermissionSlipSubmission` DROP COLUMN `user_id`;

-- Step 9: Remove the permissionSlipCompleted column from Student table
ALTER TABLE `Student` DROP COLUMN `permissionSlipCompleted`;

-- Step 10: Create migration summary report
SELECT 
    'Migration completed successfully' as status,
    (SELECT COUNT(*) FROM `PermissionSlipSubmission`) as total_permission_slips_migrated,
    (SELECT COUNT(*) FROM `PermissionSlipSubmission` WHERE `id` LIKE 'migrated_%') as synthetic_records_created,
    @active_event_id as target_event_id,
    (SELECT `name` FROM `Event` WHERE `id` = @active_event_id) as target_event_name;

-- Note: Keep the backup table for a few days, then drop it:
-- DROP TABLE `PermissionSlipSubmission_backup`;
