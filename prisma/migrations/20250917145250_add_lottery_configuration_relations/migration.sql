-- AlterTable
ALTER TABLE `ManualAssignment` ADD COLUMN `lotteryConfigurationId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `PrefillSetting` ADD COLUMN `lotteryConfigurationId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `ManualAssignment_lotteryConfigurationId_idx` ON `ManualAssignment`(`lotteryConfigurationId`);

-- CreateIndex
CREATE INDEX `PrefillSetting_lotteryConfigurationId_idx` ON `PrefillSetting`(`lotteryConfigurationId`);

-- AddForeignKey
ALTER TABLE `ManualAssignment` ADD CONSTRAINT `ManualAssignment_lotteryConfigurationId_fkey` FOREIGN KEY (`lotteryConfigurationId`) REFERENCES `LotteryConfiguration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrefillSetting` ADD CONSTRAINT `PrefillSetting_lotteryConfigurationId_fkey` FOREIGN KEY (`lotteryConfigurationId`) REFERENCES `LotteryConfiguration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
