-- Add slots_flexible field to event_template_volunteer_roles table
-- This migration fixes the NaN slots issue when using templates

-- Add the missing slots_flexible column
ALTER TABLE event_template_volunteer_roles 
ADD COLUMN slots_flexible INTEGER NOT NULL DEFAULT 0;

-- Add a comment to document the field
COMMENT ON COLUMN event_template_volunteer_roles.slots_flexible IS 'Number of slots that can be filled by either brothers or sisters, regardless of gender';

-- Update existing records to have 0 flexible slots (safe default)
UPDATE event_template_volunteer_roles 
SET slots_flexible = 0 
WHERE slots_flexible IS NULL;
