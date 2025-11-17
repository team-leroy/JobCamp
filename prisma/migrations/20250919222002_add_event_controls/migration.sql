-- AlterTable
ALTER TABLE `Event` ADD COLUMN `companyAccountsEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `eventEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `lotteryPublished` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `studentAccountsEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `studentSignupsEnabled` BOOLEAN NOT NULL DEFAULT false;
