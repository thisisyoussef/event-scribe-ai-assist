-- Relax authorization in check-in RPC: allow any authenticated user to update volunteer check-in fields

CREATE OR REPLACE FUNCTION public.update_volunteer_checkin_status(
  p_volunteer_id uuid,
  p_action text,
  p_notes text DEFAULT NULL
)
RETURNS void
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  v_exists uuid;
BEGIN
  -- Ensure the volunteer exists (avoid leaking data via errors)
  SELECT id INTO v_exists FROM public.volunteers WHERE id = p_volunteer_id;
  IF v_exists IS NULL THEN
    RAISE EXCEPTION 'Volunteer not found';
  END IF;

  -- Perform the requested action (no additional authorization checks)
  IF p_action = 'checkin' THEN
    UPDATE public.volunteers
    SET checked_in_at = NOW(),
        checked_out_at = NULL,
        check_in_notes = COALESCE(p_notes, check_in_notes)
    WHERE id = p_volunteer_id;
  ELSIF p_action = 'checkout' THEN
    UPDATE public.volunteers
    SET checked_out_at = NOW(),
        check_in_notes = COALESCE(p_notes, check_in_notes)
    WHERE id = p_volunteer_id;
  ELSIF p_action = 'notes' THEN
    UPDATE public.volunteers
    SET check_in_notes = p_notes
    WHERE id = p_volunteer_id;
  ELSIF p_action = 'running_late' THEN
    UPDATE public.volunteers
    SET checked_in_at = NULL,
        check_in_notes = COALESCE(p_notes, 'Running late')
    WHERE id = p_volunteer_id;
  ELSE
    RAISE EXCEPTION 'Invalid action. Expected one of: checkin, checkout, notes, running_late';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_volunteer_checkin_status(uuid, text, text) TO authenticated;


