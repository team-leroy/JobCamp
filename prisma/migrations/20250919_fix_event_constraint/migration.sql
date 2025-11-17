/*
  Fix the Event constraint to only enforce uniqueness for active events
  
  - Remove the existing unique constraint that prevents multiple inactive events
  - MySQL doesn't support filtered unique indexes directly, so we'll handle this at application level
  - The unique constraint on (schoolId, isActive) is removed
*/

-- Drop the existing problematic unique constraint
DROP INDEX `Event_schoolId_isActive_key` ON `Event`;
