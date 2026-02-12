-- Add visibility column to events table
-- This allows events to be public or private regardless of their status

-- Add visibility column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Create index for efficient public event queries
CREATE INDEX IF NOT EXISTS idx_events_is_public ON events(is_public);

-- Update existing events to be public by default
UPDATE events SET is_public = true WHERE is_public IS NULL;

-- Add comment to explain the field
COMMENT ON COLUMN events.is_public IS 'Whether the event is visible to the public (true) or only to admins/POCs (false)';
