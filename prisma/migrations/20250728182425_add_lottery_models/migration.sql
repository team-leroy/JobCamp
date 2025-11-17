-- CreateTable
CREATE TABLE `LotteryJob` (
    `id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `progress` DOUBLE NOT NULL DEFAULT 0,
    `currentSeed` INTEGER NOT NULL DEFAULT 0,
    `adminId` VARCHAR(191) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `error` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LotteryResults` (
    `id` VARCHAR(191) NOT NULL,
    `lotteryJobId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `positionId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `LotteryResults_studentId_lotteryJobId_key`(`studentId`, `lotteryJobId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LotteryResults` ADD CONSTRAINT `LotteryResults_lotteryJobId_fkey` FOREIGN KEY (`lotteryJobId`) REFERENCES `LotteryJob`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
