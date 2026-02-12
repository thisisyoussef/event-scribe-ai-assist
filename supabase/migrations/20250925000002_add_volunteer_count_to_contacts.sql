-- Add volunteer count to contacts
-- This migration was accidentally deleted and is being restored

-- Add volunteer_count column to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS volunteer_count INTEGER DEFAULT 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_contacts_volunteer_count ON contacts(volunteer_count);

-- Note: Trigger functionality may need to be adjusted based on actual schema
