-- Add events_attended_count to contacts and keep it updated based on volunteers

-- 1) Add column
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS events_attended_count INTEGER DEFAULT 0 NOT NULL;

-- 2) Seed existing data: count DISTINCT event_id with confirmed status per phone
UPDATE contacts c
SET events_attended_count = sub.events_attended
FROM (
  SELECT v.phone, COUNT(DISTINCT v.event_id) AS events_attended
  FROM volunteers v
  WHERE COALESCE(v.status, 'confirmed') = 'confirmed'
  GROUP BY v.phone
) AS sub
WHERE sub.phone = c.phone;

-- 3) Helper function to recalc one contact by phone
CREATE OR REPLACE FUNCTION recalc_events_attended_for_contact(p_phone TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE contacts c
  SET events_attended_count = (
    SELECT COUNT(DISTINCT v.event_id)
    FROM volunteers v
    WHERE v.phone = p_phone AND COALESCE(v.status, 'confirmed') = 'confirmed'
  )
  WHERE c.phone = p_phone;
END;
$$ LANGUAGE plpgsql;

-- 4) Trigger function fired on volunteers changes
CREATE OR REPLACE FUNCTION trg_update_events_attended()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM recalc_events_attended_for_contact(NEW.phone);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.phone IS DISTINCT FROM OLD.phone THEN
      PERFORM recalc_events_attended_for_contact(OLD.phone);
      PERFORM recalc_events_attended_for_contact(NEW.phone);
    ELSIF COALESCE(NEW.status, 'confirmed') IS DISTINCT FROM COALESCE(OLD.status, 'confirmed') OR NEW.event_id IS DISTINCT FROM OLD.event_id THEN
      PERFORM recalc_events_attended_for_contact(NEW.phone);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM recalc_events_attended_for_contact(OLD.phone);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 5) Attach trigger to volunteers
DROP TRIGGER IF EXISTS trg_update_events_attended_on_volunteers ON volunteers;
CREATE TRIGGER trg_update_events_attended_on_volunteers
AFTER INSERT OR UPDATE OR DELETE ON volunteers
FOR EACH ROW
EXECUTE FUNCTION trg_update_events_attended();

-- 6) Index for faster filtering/sorting by attendance
CREATE INDEX IF NOT EXISTS idx_contacts_events_attended_count ON contacts(events_attended_count);


