-- Replace duration_minutes with shift_end_time for more intuitive time customization
-- This allows users to set start and end times directly instead of calculating duration

-- First, add the new shift_end_time column
ALTER TABLE volunteer_roles 
ADD COLUMN IF NOT EXISTS shift_end_time TEXT;

-- Update existing records to calculate shift_end_time from duration_minutes
UPDATE volunteer_roles 
SET shift_end_time = (
  CASE 
    WHEN duration_minutes IS NOT NULL THEN
      -- Convert start time to minutes, add duration, then back to HH:MM format
      LPAD(
        FLOOR(
          (CAST(SPLIT_PART(shift_start, ':', 1) AS INTEGER) * 60 + 
           CAST(SPLIT_PART(shift_start, ':', 2) AS INTEGER) + 
           duration_minutes) / 60
        )::TEXT, 
        2, '0'
      ) || ':' ||
      LPAD(
        MOD(
          (CAST(SPLIT_PART(shift_start, ':', 1) AS INTEGER) * 60 + 
           CAST(SPLIT_PART(shift_start, ':', 2) AS INTEGER) + 
           duration_minutes), 
          60
        )::TEXT, 
        2, '0'
      )
    ELSE shift_end
  END
);

-- Make the column NOT NULL after setting values
ALTER TABLE volunteer_roles 
ALTER COLUMN shift_end_time SET NOT NULL;

-- Drop the old duration_minutes column
ALTER TABLE volunteer_roles 
DROP COLUMN IF EXISTS duration_minutes;

-- Add a check constraint to ensure end time is after start time
ALTER TABLE volunteer_roles 
ADD CONSTRAINT check_shift_times 
CHECK (
  CAST(SPLIT_PART(shift_start, ':', 1) AS INTEGER) * 60 + CAST(SPLIT_PART(shift_start, ':', 2) AS INTEGER) <
  CAST(SPLIT_PART(shift_end_time, ':', 1) AS INTEGER) * 60 + CAST(SPLIT_PART(shift_end_time, ':', 2) AS INTEGER)
);

-- Add comment for documentation
COMMENT ON COLUMN volunteer_roles.shift_end_time IS 'End time of the volunteer shift in HH:MM format. Must be after shift_start.';
