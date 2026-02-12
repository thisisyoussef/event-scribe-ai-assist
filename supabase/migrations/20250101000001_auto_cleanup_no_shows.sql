-- Auto cleanup no-show volunteers 5 hours after event ends
-- This creates a scheduled function that runs every hour to check for events that ended 5+ hours ago

-- Create function to cleanup no-show volunteers for events that ended 5+ hours ago
CREATE OR REPLACE FUNCTION cleanup_no_shows_after_event()
RETURNS TABLE (
  event_id UUID,
  event_title TEXT,
  no_show_count INTEGER,
  removed_contacts JSONB
) AS $$
DECLARE
  event_record RECORD;
  no_show_count INTEGER := 0;
  removed_contacts JSONB := '[]'::jsonb;
  contact_record RECORD;
  five_hours_ago TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate 5 hours ago
  five_hours_ago := NOW() - INTERVAL '5 hours';
  
  -- Find events that ended 5+ hours ago
  FOR event_record IN 
    SELECT id, title, end_datetime
    FROM events 
    WHERE end_datetime < five_hours_ago 
      AND deleted_at IS NULL
  LOOP
    -- Reset counters for this event
    no_show_count := 0;
    removed_contacts := '[]'::jsonb;
    
    -- Get no-show volunteers for this event
    SELECT COUNT(*) INTO no_show_count
    FROM volunteers v
    WHERE v.event_id = event_record.id
      AND v.status = 'confirmed'
      AND v.checked_in_at IS NULL;
    
    -- If there are no-show volunteers, get their contact info
    IF no_show_count > 0 THEN
      -- Get contact IDs for no-show volunteers
      FOR contact_record IN
        SELECT c.id, c.name, c.phone
        FROM contacts c
        WHERE c.phone IN (
          SELECT v.phone
          FROM volunteers v
          WHERE v.event_id = event_record.id
            AND v.status = 'confirmed'
            AND v.checked_in_at IS NULL
        )
      LOOP
        -- Add to removed contacts list
        removed_contacts := removed_contacts || jsonb_build_object(
          'id', contact_record.id,
          'name', contact_record.name,
          'phone', contact_record.phone
        );
      END LOOP;
      
      -- Delete the contacts
      DELETE FROM contacts
      WHERE phone IN (
        SELECT v.phone
        FROM volunteers v
        WHERE v.event_id = event_record.id
          AND v.status = 'confirmed'
          AND v.checked_in_at IS NULL
      );
      
      -- Log the cleanup
      INSERT INTO cleanup_logs (event_id, event_title, no_show_count, removed_contacts, cleaned_at)
      VALUES (event_record.id, event_record.title, no_show_count, removed_contacts, NOW());
    END IF;
    
    -- Return result for this event
    event_id := event_record.id;
    event_title := event_record.title;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create cleanup logs table to track cleanup operations
CREATE TABLE IF NOT EXISTS cleanup_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  event_title TEXT NOT NULL,
  no_show_count INTEGER NOT NULL,
  removed_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  cleaned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_event_id ON cleanup_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_cleaned_at ON cleanup_logs(cleaned_at);

-- Create a function to manually trigger cleanup (for testing)
CREATE OR REPLACE FUNCTION trigger_cleanup_no_shows()
RETURNS JSONB AS $$
DECLARE
  result JSONB := '[]'::jsonb;
  event_result RECORD;
BEGIN
  FOR event_result IN 
    SELECT * FROM cleanup_no_shows_after_event()
  LOOP
    result := result || jsonb_build_object(
      'event_id', event_result.event_id,
      'event_title', event_result.event_title,
      'no_show_count', event_result.no_show_count,
      'removed_contacts', event_result.removed_contacts
    );
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION cleanup_no_shows_after_event() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_cleanup_no_shows() TO authenticated;
GRANT SELECT, INSERT ON cleanup_logs TO authenticated;

-- Add RLS policies for cleanup_logs
ALTER TABLE cleanup_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Users can view cleanup logs for their events" ON cleanup_logs;

CREATE POLICY "Users can view cleanup logs for their events" ON cleanup_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = cleanup_logs.event_id AND created_by = auth.uid()
    )
  );

-- Note: To set up automatic scheduling, you would need to:
-- 1. Set up a cron job or scheduled function in your Supabase project
-- 2. Call cleanup_no_shows_after_event() every hour
-- 3. Or use the Edge Function with a cron trigger

