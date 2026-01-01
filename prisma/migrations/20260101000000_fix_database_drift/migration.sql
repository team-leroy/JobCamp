-- Consolidated migration to fix database drift where schema.prisma had fields missing from migration files

-- AlterTable: Attachment
ALTER TABLE `Attachment` ADD COLUMN `storagePath` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable: Position
ALTER TABLE `Position` ADD COLUMN `isPublished` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Student
ALTER TABLE `Student` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `graduatedAt` DATETIME(3) NULL;

-- AlterTable: Event
ALTER TABLE `Event` ADD COLUMN `name` VARCHAR(191) NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `activatedAt` DATETIME(3) NULL;

-- AlterTable: User
ALTER TABLE `User` ADD COLUMN `role` ENUM('FULL_ADMIN', 'READ_ONLY_ADMIN') NULL;

-- AlterTable: LotteryJob
ALTER TABLE `LotteryJob` ADD COLUMN `error` VARCHAR(191) NULL;
