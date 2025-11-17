/*
  Warnings:

  - Added the required column `eventId` to the `LotteryJob` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Add the column as nullable first
ALTER TABLE `LotteryJob` ADD COLUMN `eventId` VARCHAR(191);

-- Step 2: Set eventId for existing lottery jobs to the active event (if any)
UPDATE `LotteryJob` 
SET `eventId` = (
    SELECT `id` 
    FROM `Event` 
    WHERE `isActive` = true 
    LIMIT 1
)
WHERE `eventId` IS NULL;

-- Step 3: Delete any lottery jobs that couldn't be associated with an event
DELETE FROM `LotteryJob` WHERE `eventId` IS NULL;

-- Step 4: Make the column required
ALTER TABLE `LotteryJob` MODIFY COLUMN `eventId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `LotteryJob_eventId_idx` ON `LotteryJob`(`eventId`);

-- AddForeignKey
ALTER TABLE `LotteryJob` ADD CONSTRAINT `LotteryJob_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
