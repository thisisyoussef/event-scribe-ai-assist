-- Add duration_minutes field to volunteer_roles table
-- This allows volunteer roles to have customizable time slot durations instead of being limited to 1 hour

ALTER TABLE volunteer_roles 
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;

-- Update existing records to have 60 minutes duration (maintaining backward compatibility)
UPDATE volunteer_roles 
SET duration_minutes = 60 
WHERE duration_minutes IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE volunteer_roles 
ALTER COLUMN duration_minutes SET NOT NULL;

-- Add a check constraint to ensure reasonable duration values
ALTER TABLE volunteer_roles 
ADD CONSTRAINT check_duration_minutes 
CHECK (duration_minutes > 0 AND duration_minutes <= 1440); -- Max 24 hours (1440 minutes)

-- Add comment for documentation
COMMENT ON COLUMN volunteer_roles.duration_minutes IS 'Duration of the volunteer shift in minutes. Defaults to 60 minutes (1 hour).';
