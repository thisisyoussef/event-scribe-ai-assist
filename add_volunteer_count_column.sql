-- Run this SQL in Supabase Studio > SQL Editor
-- This will add the total_events_volunteered column to the contacts table

-- Add the column
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS total_events_volunteered INTEGER DEFAULT 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_volunteers_phone ON volunteers(phone);

-- Update all existing contacts with their current volunteer counts
UPDATE contacts 
SET total_events_volunteered = (
  SELECT COUNT(DISTINCT v.event_id)
  FROM volunteers v
  WHERE v.phone = contacts.phone
    AND v.status = 'confirmed'
);

-- Create a function to update the volunteer count for a contact
CREATE OR REPLACE FUNCTION update_contact_volunteer_count(contact_phone TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE contacts 
  SET total_events_volunteered = (
    SELECT COUNT(DISTINCT v.event_id)
    FROM volunteers v
    WHERE v.phone = contact_phone
      AND v.status = 'confirmed'
  )
  WHERE phone = contact_phone;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the count when volunteers are added/updated/deleted
CREATE OR REPLACE FUNCTION trigger_update_contact_volunteer_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_contact_volunteer_count(NEW.phone);
  END IF;
  
  -- Handle DELETE and UPDATE (for old phone number)
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.phone != NEW.phone) THEN
    PERFORM update_contact_volunteer_count(OLD.phone);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS volunteers_contact_count_trigger ON volunteers;
CREATE TRIGGER volunteers_contact_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON volunteers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_contact_volunteer_count();
