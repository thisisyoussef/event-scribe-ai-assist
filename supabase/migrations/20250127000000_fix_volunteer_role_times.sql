-- Fix volunteer role times to match their associated itinerary item times
-- This migration updates volunteer roles that have incorrect shift_start times
-- to match the time_slot of their associated itinerary item

-- Create a function to fix volunteer role times for a specific event
CREATE OR REPLACE FUNCTION fix_volunteer_role_times(target_event_id UUID)
RETURNS TABLE(role_id UUID, old_start_time TEXT, new_start_time TEXT, old_end_time TEXT, new_end_time TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  role_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  -- Loop through volunteer roles for the specified event
  FOR role_record IN
    SELECT 
      vr.id,
      vr.shift_start,
      vr.shift_end,
      vr.shift_end_time,
      i.time_slot as itinerary_time
    FROM volunteer_roles vr
    JOIN itineraries i ON vr.itinerary_id = i.id
    WHERE vr.event_id = target_event_id
      AND i.time_slot IS NOT NULL
      AND i.time_slot != ''
      AND vr.shift_start != i.time_slot
  LOOP
    -- Calculate new end time (1 hour after itinerary time)
    DECLARE
      new_end_time TEXT;
    BEGIN
      SELECT 
        LPAD(
          FLOOR(
            (CAST(SPLIT_PART(role_record.itinerary_time, ':', 1) AS INTEGER) * 60 + 
             CAST(SPLIT_PART(role_record.itinerary_time, ':', 2) AS INTEGER) + 60) / 60
          )::TEXT, 
          2, '0'
        ) || ':' ||
        LPAD(
          MOD(
            (CAST(SPLIT_PART(role_record.itinerary_time, ':', 1) AS INTEGER) * 60 + 
             CAST(SPLIT_PART(role_record.itinerary_time, ':', 2) AS INTEGER) + 60), 
            60
          )::TEXT, 
          2, '0'
        )
      INTO new_end_time;

      -- Update the volunteer role
      UPDATE volunteer_roles 
      SET 
        shift_start = role_record.itinerary_time,
        shift_end = new_end_time,
        shift_end_time = new_end_time
      WHERE id = role_record.id;

      -- Return the changes
      role_id := role_record.id;
      old_start_time := role_record.shift_start;
      new_start_time := role_record.itinerary_time;
      old_end_time := role_record.shift_end;
      new_end_time := new_end_time;
      
      updated_count := updated_count + 1;
      RETURN NEXT;
    END;
  END LOOP;

  -- If no roles were updated, return a message
  IF updated_count = 0 THEN
    role_id := NULL;
    old_start_time := 'No roles needed updating';
    new_start_time := '';
    old_end_time := '';
    new_end_time := '';
    RETURN NEXT;
  END IF;
END;
$$;

-- Update volunteer roles that have itinerary_id set to use the itinerary time_slot
UPDATE volunteer_roles 
SET shift_start = i.time_slot
FROM itineraries i
WHERE volunteer_roles.itinerary_id = i.id
  AND volunteer_roles.shift_start != i.time_slot
  AND i.time_slot IS NOT NULL
  AND i.time_slot != '';

-- Also update shift_end_time to be consistent
-- Calculate end time as 1 hour after start time (or use existing shift_end if it's reasonable)
UPDATE volunteer_roles 
SET shift_end_time = CASE
  WHEN i.time_slot IS NOT NULL AND i.time_slot != '' THEN
    -- Calculate 1 hour after the itinerary time
    LPAD(
      FLOOR(
        (CAST(SPLIT_PART(i.time_slot, ':', 1) AS INTEGER) * 60 + 
         CAST(SPLIT_PART(i.time_slot, ':', 2) AS INTEGER) + 60) / 60
      )::TEXT, 
      2, '0'
    ) || ':' ||
    LPAD(
      MOD(
        (CAST(SPLIT_PART(i.time_slot, ':', 1) AS INTEGER) * 60 + 
         CAST(SPLIT_PART(i.time_slot, ':', 2) AS INTEGER) + 60), 
        60
      )::TEXT, 
      2, '0'
    )
  ELSE volunteer_roles.shift_end_time
END,
shift_end = CASE
  WHEN i.time_slot IS NOT NULL AND i.time_slot != '' THEN
    -- Calculate 1 hour after the itinerary time
    LPAD(
      FLOOR(
        (CAST(SPLIT_PART(i.time_slot, ':', 1) AS INTEGER) * 60 + 
         CAST(SPLIT_PART(i.time_slot, ':', 2) AS INTEGER) + 60) / 60
      )::TEXT, 
      2, '0'
    ) || ':' ||
    LPAD(
      MOD(
        (CAST(SPLIT_PART(i.time_slot, ':', 1) AS INTEGER) * 60 + 
         CAST(SPLIT_PART(i.time_slot, ':', 2) AS INTEGER) + 60), 
        60
      )::TEXT, 
      2, '0'
    )
  ELSE volunteer_roles.shift_end
END
FROM itineraries i
WHERE volunteer_roles.itinerary_id = i.id
  AND i.time_slot IS NOT NULL
  AND i.time_slot != '';

-- Add a comment for documentation
COMMENT ON TABLE volunteer_roles IS 'Volunteer roles with corrected times matching their itinerary items';
