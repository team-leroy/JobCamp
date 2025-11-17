/*
  Warnings:

  - A unique constraint covering the columns `[schoolId,isActive]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Event` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isArchived` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `name` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Event_schoolId_isArchived_date_idx` ON `Event`(`schoolId`, `isArchived`, `date`);

-- CreateIndex
CREATE UNIQUE INDEX `Event_schoolId_isActive_key` ON `Event`(`schoolId`, `isActive`);
