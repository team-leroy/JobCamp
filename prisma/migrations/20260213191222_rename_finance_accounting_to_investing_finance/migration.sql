-- Rename career category from Finance/Accounting to Investing/Finance (issue #239)
UPDATE `Position` SET `career` = 'Investing/Finance' WHERE `career` = 'Finance/Accounting';
