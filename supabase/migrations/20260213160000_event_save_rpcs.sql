-- SECURITY DEFINER RPCs for the full event save flow.
-- These bypass RLS so that any authenticated user (admin) can edit any event,
-- including events created by other users.

-- =============================================================================
-- 1. Update event details (title, description, dates, etc.)
-- =============================================================================
CREATE OR REPLACE FUNCTION admin_update_event_details(
  p_event_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_location TEXT,
  p_start_datetime TIMESTAMPTZ,
  p_end_datetime TIMESTAMPTZ,
  p_status TEXT,
  p_is_public BOOLEAN,
  p_sms_enabled BOOLEAN,
  p_day_before_time TEXT,
  p_day_of_time TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE events SET
    title = p_title,
    description = p_description,
    location = p_location,
    start_datetime = p_start_datetime,
    end_datetime = p_end_datetime,
    status = p_status,
    is_public = p_is_public,
    sms_enabled = p_sms_enabled,
    day_before_time = p_day_before_time,
    day_of_time = p_day_of_time,
    updated_at = NOW()
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found: %', p_event_id;
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_event_details(UUID,TEXT,TEXT,TEXT,TIMESTAMPTZ,TIMESTAMPTZ,TEXT,BOOLEAN,BOOLEAN,TEXT,TEXT) TO authenticated;

-- =============================================================================
-- 2. Upsert an itinerary item (insert or update)
-- =============================================================================
CREATE OR REPLACE FUNCTION admin_upsert_itinerary(
  p_id UUID,
  p_event_id UUID,
  p_time_slot TEXT,
  p_activity TEXT,
  p_description TEXT,
  p_duration_minutes INT,
  p_is_update BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  IF p_is_update THEN
    UPDATE itineraries SET
      time_slot = p_time_slot,
      activity = p_activity,
      description = p_description,
      duration_minutes = p_duration_minutes
    WHERE id = p_id;
    result_id := p_id;
  ELSE
    INSERT INTO itineraries (event_id, time_slot, activity, description, duration_minutes)
    VALUES (p_event_id, p_time_slot, p_activity, p_description, p_duration_minutes)
    RETURNING id INTO result_id;
  END IF;

  RETURN result_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_upsert_itinerary(UUID,UUID,TEXT,TEXT,TEXT,INT,BOOLEAN) TO authenticated;

-- =============================================================================
-- 3. Upsert a volunteer role (insert or update)
-- =============================================================================
CREATE OR REPLACE FUNCTION admin_upsert_volunteer_role(
  p_id UUID,
  p_event_id UUID,
  p_role_label TEXT,
  p_slots_brother INT,
  p_slots_sister INT,
  p_slots_flexible INT,
  p_notes TEXT,
  p_suggested_poc JSONB,
  p_shift_start TEXT,
  p_shift_end_time TEXT,
  p_shift_end TEXT,
  p_itinerary_id UUID,
  p_is_update BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  IF p_is_update THEN
    UPDATE volunteer_roles SET
      role_label = p_role_label,
      slots_brother = p_slots_brother,
      slots_sister = p_slots_sister,
      slots_flexible = p_slots_flexible,
      notes = p_notes,
      suggested_poc = p_suggested_poc,
      shift_start = p_shift_start,
      shift_end_time = p_shift_end_time,
      shift_end = p_shift_end,
      itinerary_id = p_itinerary_id
    WHERE id = p_id;
    result_id := p_id;
  ELSE
    INSERT INTO volunteer_roles (
      event_id, role_label, slots_brother, slots_sister, slots_flexible,
      notes, suggested_poc, shift_start, shift_end_time, shift_end, itinerary_id
    ) VALUES (
      p_event_id, p_role_label, p_slots_brother, p_slots_sister, p_slots_flexible,
      p_notes, p_suggested_poc, p_shift_start, p_shift_end_time, p_shift_end, p_itinerary_id
    )
    RETURNING id INTO result_id;
  END IF;

  RETURN result_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_upsert_volunteer_role(UUID,UUID,TEXT,INT,INT,INT,TEXT,JSONB,TEXT,TEXT,TEXT,UUID,BOOLEAN) TO authenticated;

-- =============================================================================
-- 4. Batch delete volunteer roles by IDs
-- =============================================================================
CREATE OR REPLACE FUNCTION admin_delete_roles_by_ids(p_role_ids UUID[])
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM volunteer_roles WHERE id = ANY(p_role_ids);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_delete_roles_by_ids(UUID[]) TO authenticated;
