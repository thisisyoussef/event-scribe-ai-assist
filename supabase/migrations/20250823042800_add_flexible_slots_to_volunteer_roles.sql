-- Add flexible slots column to volunteer_roles table
-- This allows roles to have slots that can be filled by either gender

ALTER TABLE volunteer_roles 
ADD COLUMN slots_flexible INTEGER NOT NULL DEFAULT 0;

-- Add comment explaining the purpose
COMMENT ON COLUMN volunteer_roles.slots_flexible IS 'Number of slots that can be filled by either brothers or sisters, regardless of gender';
