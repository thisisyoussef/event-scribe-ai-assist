-- Secure RPC to update volunteer check-in/notes with clear authorization
-- Allows: event owner, any shared user, or POC-for-event

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
  v_event_id uuid;
BEGIN
  SELECT event_id INTO v_event_id FROM public.volunteers WHERE id = p_volunteer_id;
  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Volunteer not found';
  END IF;

  -- Authorization check: event owner OR shared user OR POC-for-event
  IF NOT (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = v_event_id AND e.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.event_shares es WHERE es.event_id = v_event_id AND es.shared_with = auth.uid())
    OR (EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_user_poc_for_event') AND public.is_user_poc_for_event(v_event_id))
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Perform the requested action
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


