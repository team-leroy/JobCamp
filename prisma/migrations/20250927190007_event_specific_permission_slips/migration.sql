-- Event-Specific Permission Slips Migration (Safe Version)
-- This migration transforms permission slips from student-global to event-specific

-- Step 1: Populate the new columns that were already added by the failed migration
UPDATE `PermissionSlipSubmission` 
SET `studentId` = (
    SELECT `id` 
    FROM `Student` 
    WHERE `Student`.`userId` = `PermissionSlipSubmission`.`user_id`
    LIMIT 1
),
`eventId` = (
    SELECT `id` 
    FROM `Event` 
    WHERE `isActive` = true 
    LIMIT 1
)
WHERE `studentId` IS NULL OR `eventId` IS NULL;

-- Step 2: Create permission slip records for students who have permissionSlipCompleted = true
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
    (SELECT `id` FROM `Event` WHERE `isActive` = true LIMIT 1) as `eventId`,
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
    SELECT `studentId` FROM `PermissionSlipSubmission` WHERE `studentId` IS NOT NULL
)
AND EXISTS (SELECT 1 FROM `Event` WHERE `isActive` = true)
AND NOT EXISTS (
    SELECT 1 FROM `PermissionSlipSubmission` WHERE `id` = CONCAT('migrated_', `Student`.`id`)
);

-- Step 3: Remove any permission slip records that couldn't be linked
DELETE FROM `PermissionSlipSubmission` 
WHERE `studentId` IS NULL OR `eventId` IS NULL;

-- Step 4: Make the new columns required
ALTER TABLE `PermissionSlipSubmission` MODIFY COLUMN `studentId` VARCHAR(191) NOT NULL;
ALTER TABLE `PermissionSlipSubmission` MODIFY COLUMN `eventId` VARCHAR(191) NOT NULL;

-- Step 5: Drop the old user_id column and unique constraint
ALTER TABLE `PermissionSlipSubmission` DROP INDEX `PermissionSlipSubmission_user_id_key`;
ALTER TABLE `PermissionSlipSubmission` DROP COLUMN `user_id`;

-- Step 6: Add new constraints and indexes
ALTER TABLE `PermissionSlipSubmission` ADD CONSTRAINT `PermissionSlipSubmission_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `PermissionSlipSubmission` ADD CONSTRAINT `PermissionSlipSubmission_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Add unique constraint and indexes
ALTER TABLE `PermissionSlipSubmission` ADD UNIQUE INDEX `PermissionSlipSubmission_studentId_eventId_key`(`studentId`, `eventId`);
CREATE INDEX `PermissionSlipSubmission_studentId_idx` ON `PermissionSlipSubmission`(`studentId`);
CREATE INDEX `PermissionSlipSubmission_eventId_idx` ON `PermissionSlipSubmission`(`eventId`);

-- Step 8: Remove the permissionSlipCompleted column from Student table
ALTER TABLE `Student` DROP COLUMN `permissionSlipCompleted`;