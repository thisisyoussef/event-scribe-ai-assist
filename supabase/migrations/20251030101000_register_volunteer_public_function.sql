-- Public volunteer signup function to avoid complex client-side RLS interactions
-- Validates event is published and public, ensures a contact under event owner, inserts volunteer, and logs signup

CREATE OR REPLACE FUNCTION public.register_volunteer_public(
  p_event_id uuid,
  p_role_id uuid,
  p_name text,
  p_phone text,
  p_gender text,
  p_notes text
) RETURNS public.volunteers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.events%ROWTYPE;
  v_contact public.contacts%ROWTYPE;
  v_volunteer public.volunteers%ROWTYPE;
BEGIN
  -- Validate event is open for public signup
  SELECT * INTO v_event
  FROM public.events e
  WHERE e.id = p_event_id
    AND e.status = 'published'
    AND COALESCE(e.is_public, false) = true
    AND e.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EVENT_NOT_OPEN' USING HINT = 'Event must be published, public, and not deleted.';
  END IF;

  -- Validate role belongs to event
  IF NOT EXISTS (
    SELECT 1 FROM public.volunteer_roles vr WHERE vr.id = p_role_id AND vr.event_id = p_event_id
  ) THEN
    RAISE EXCEPTION 'INVALID_ROLE' USING HINT = 'Role must belong to the specified event.';
  END IF;

  -- Ensure a contact by phone (global, avoids unique_phone_non_empty conflicts)
  SELECT * INTO v_contact
  FROM public.contacts c
  WHERE c.phone = p_phone
  LIMIT 1;

  IF NOT FOUND THEN
    -- Insert owned by event creator; tolerate races via ON CONFLICT on unique_phone_non_empty
    INSERT INTO public.contacts (user_id, name, phone, source, gender, role)
    VALUES (v_event.created_by, p_name, p_phone, 'volunteer_signup', p_gender, 'volunteer')
    ON CONFLICT ON CONSTRAINT unique_phone_non_empty DO NOTHING;

    -- Re-select after possible conflict
    SELECT * INTO v_contact
    FROM public.contacts c
    WHERE c.phone = p_phone
    LIMIT 1;
  ELSE
    -- Best-effort update of gender only if the contact is owned by the event owner
    IF v_contact.user_id = v_event.created_by AND v_contact.gender IS DISTINCT FROM p_gender THEN
      UPDATE public.contacts
      SET gender = p_gender, updated_at = NOW()
      WHERE id = v_contact.id;
    END IF;
  END IF;

  -- Insert the volunteer
  INSERT INTO public.volunteers (event_id, role_id, name, phone, gender, notes, status)
  VALUES (p_event_id, p_role_id, p_name, p_phone, p_gender, p_notes, 'confirmed')
  RETURNING * INTO v_volunteer;

  -- Log the signup history (best-effort; do not block on failure)
  BEGIN
    INSERT INTO public.volunteer_signups (contact_id, event_id, role_id, status)
    VALUES (v_contact.id, p_event_id, p_role_id, 'confirmed');
  EXCEPTION WHEN OTHERS THEN
    -- Ignore history failures
    NULL;
  END;

  RETURN v_volunteer;
END
$$;

-- Allow both anon and authenticated to execute this function (the function enforces checks)
GRANT EXECUTE ON FUNCTION public.register_volunteer_public(uuid, uuid, text, text, text, text) TO anon, authenticated;


