-- Allow overnight events and volunteer shifts
-- Remove the constraint that prevents end time from being before start time

-- Drop the existing constraint that prevents overnight shifts
ALTER TABLE volunteer_roles 
DROP CONSTRAINT IF EXISTS check_shift_times;

-- Update the comment to reflect that overnight shifts are now allowed
COMMENT ON COLUMN volunteer_roles.shift_end_time IS 'End time of the volunteer shift in HH:MM format. Can be on the next day for overnight events.';
