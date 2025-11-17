/*
  Warnings:

  - You are about to drop the column `adminId` on the `School` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `School` DROP FOREIGN KEY `School_adminId_fkey`;

-- DropIndex
DROP INDEX `School_adminId_key` ON `School`;

-- AlterTable
ALTER TABLE `School` DROP COLUMN `adminId`;

-- CreateTable
CREATE TABLE `_SchoolAdmins` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_SchoolAdmins_AB_unique`(`A`, `B`),
    INDEX `_SchoolAdmins_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_SchoolAdmins` ADD CONSTRAINT `_SchoolAdmins_A_fkey` FOREIGN KEY (`A`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_SchoolAdmins` ADD CONSTRAINT `_SchoolAdmins_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
