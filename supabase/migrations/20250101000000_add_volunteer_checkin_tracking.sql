-- Add volunteer check-in tracking to volunteers table
-- This allows POCs to track which volunteers actually showed up to events

-- Add check-in tracking columns to volunteers table
ALTER TABLE volunteers 
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS check_in_notes TEXT;

-- Add index for performance when querying check-in status
CREATE INDEX IF NOT EXISTS idx_volunteers_checked_in_at ON volunteers(checked_in_at);
CREATE INDEX IF NOT EXISTS idx_volunteers_checked_out_at ON volunteers(checked_out_at);

-- Add function to get volunteers who didn't check in for an event
CREATE OR REPLACE FUNCTION get_no_show_volunteers(p_event_id UUID)
RETURNS TABLE (
  volunteer_id UUID,
  volunteer_name TEXT,
  volunteer_phone TEXT,
  role_label TEXT,
  signup_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id as volunteer_id,
    v.name as volunteer_name,
    v.phone as volunteer_phone,
    vr.role_label,
    v.signup_date
  FROM volunteers v
  JOIN volunteer_roles vr ON v.role_id = vr.id
  WHERE v.event_id = p_event_id
    AND v.status = 'confirmed'
    AND v.checked_in_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Add function to clean up no-show volunteers from contacts database
-- This removes volunteers who didn't check in from their participation records
CREATE OR REPLACE FUNCTION cleanup_no_show_volunteers(p_event_id UUID)
RETURNS TABLE (
  removed_contact_id UUID,
  contact_name TEXT,
  contact_phone TEXT
) AS $$
DECLARE
  volunteer_record RECORD;
  contact_record RECORD;
BEGIN
  -- Get all no-show volunteers for this event
  FOR volunteer_record IN 
    SELECT v.id, v.name, v.phone, v.role_id
    FROM volunteers v
    WHERE v.event_id = p_event_id
      AND v.status = 'confirmed'
      AND v.checked_in_at IS NULL
  LOOP
    -- Find the contact record for this volunteer
    SELECT c.id, c.name, c.phone INTO contact_record
    FROM contacts c
    WHERE c.phone = volunteer_record.phone
    LIMIT 1;
    
    -- If contact exists, return it for removal tracking
    IF FOUND THEN
      removed_contact_id := contact_record.id;
      contact_name := contact_record.name;
      contact_phone := contact_record.phone;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add function to mark event as completed and trigger cleanup
CREATE OR REPLACE FUNCTION complete_event_and_cleanup(p_event_id UUID)
RETURNS TABLE (
  event_title TEXT,
  no_show_count INTEGER,
  removed_contacts JSONB
) AS $$
DECLARE
  event_record RECORD;
  no_show_count INTEGER := 0;
  removed_contacts JSONB := '[]'::jsonb;
  contact_record RECORD;
BEGIN
  -- Get event details
  SELECT title INTO event_record FROM events WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found: %', p_event_id;
  END IF;
  
  -- Count no-show volunteers
  SELECT COUNT(*) INTO no_show_count
  FROM volunteers v
  WHERE v.event_id = p_event_id
    AND v.status = 'confirmed'
    AND v.checked_in_at IS NULL;
  
  -- Get list of contacts to be removed
  FOR contact_record IN 
    SELECT * FROM cleanup_no_show_volunteers(p_event_id)
  LOOP
    removed_contacts := removed_contacts || jsonb_build_object(
      'id', contact_record.removed_contact_id,
      'name', contact_record.contact_name,
      'phone', contact_record.contact_phone
    );
  END LOOP;
  
  -- Mark event as completed (you might want to add a status field to events table)
  -- UPDATE events SET status = 'completed' WHERE id = p_event_id;
  
  RETURN QUERY SELECT 
    event_record.title,
    no_show_count,
    removed_contacts;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for check-in data
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Event owners and editors can update volunteer check-in status" ON volunteers;
DROP POLICY IF EXISTS "Event owners and shared users can view volunteer check-in status" ON volunteers;

-- Allow event owners and shared users with edit access to update check-in status
CREATE POLICY "volunteers_update_checkin_owners_editors" ON volunteers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = volunteers.event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = volunteers.event_id 
        AND shared_with = auth.uid() 
        AND permission_level = 'edit'
    )
  );

-- Allow viewing check-in status for event owners and shared users
CREATE POLICY "volunteers_select_checkin_owners_shared" ON volunteers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = volunteers.event_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE event_id = volunteers.event_id AND shared_with = auth.uid()
    )
  );

