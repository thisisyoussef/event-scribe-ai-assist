-- Add visibility column to events table
-- Run this in your Supabase SQL Editor

-- Add the is_public column
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Update existing events to be public by default
UPDATE events SET is_public = true WHERE is_public IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_events_is_public ON events(is_public);

-- Add comment
COMMENT ON COLUMN events.is_public IS 'Whether the event is visible to the public (true) or only to admins/POCs (false)';
