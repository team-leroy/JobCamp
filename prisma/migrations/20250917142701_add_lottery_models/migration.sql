-- CreateTable
CREATE TABLE `LotteryConfiguration` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `gradeOrder` VARCHAR(191) NOT NULL DEFAULT 'NONE',

    UNIQUE INDEX `LotteryConfiguration_schoolId_key`(`schoolId`),
    INDEX `LotteryConfiguration_schoolId_idx`(`schoolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ManualAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `positionId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ManualAssignment_studentId_idx`(`studentId`),
    INDEX `ManualAssignment_positionId_idx`(`positionId`),
    UNIQUE INDEX `ManualAssignment_studentId_positionId_key`(`studentId`, `positionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PrefillSetting` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `positionId` VARCHAR(191) NOT NULL,
    `slots` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PrefillSetting_companyId_idx`(`companyId`),
    INDEX `PrefillSetting_positionId_idx`(`positionId`),
    UNIQUE INDEX `PrefillSetting_companyId_positionId_key`(`companyId`, `positionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LotteryConfiguration` ADD CONSTRAINT `LotteryConfiguration_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ManualAssignment` ADD CONSTRAINT `ManualAssignment_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ManualAssignment` ADD CONSTRAINT `ManualAssignment_positionId_fkey` FOREIGN KEY (`positionId`) REFERENCES `Position`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrefillSetting` ADD CONSTRAINT `PrefillSetting_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrefillSetting` ADD CONSTRAINT `PrefillSetting_positionId_fkey` FOREIGN KEY (`positionId`) REFERENCES `Position`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
