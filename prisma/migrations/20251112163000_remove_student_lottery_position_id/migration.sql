ALTER TABLE `Student`
  DROP FOREIGN KEY `Student_lotteryPositionId_fkey`,
  DROP COLUMN `lotteryPositionId`;

ALTER TABLE `LotteryResults`
  ADD CONSTRAINT `LotteryResults_studentId_fkey`
    FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `LotteryResults_positionId_fkey`
    FOREIGN KEY (`positionId`) REFERENCES `Position`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
