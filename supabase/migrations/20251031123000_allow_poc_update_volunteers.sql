-- Allow any POC on a shared event to update volunteer check-in status
-- This ensures non-originator POCs can check in/out, mark running late, and edit check-in notes

-- Ensure RLS is enabled (defensive)
ALTER TABLE IF EXISTS public.volunteers ENABLE ROW LEVEL SECURITY;

-- Policy: shared users on the event OR event owner OR POC-for-event can UPDATE volunteers
-- Note: This intentionally allows UPDATE for any user shared on the event, regardless of permission_level,
-- to simplify check-in flows for POCs. Tighten if needed by requiring permission_level = 'edit'.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'volunteers' AND policyname = 'volunteers_update_shared_or_poc'
  ) THEN
    CREATE POLICY "volunteers_update_shared_or_poc" ON public.volunteers
      FOR UPDATE TO authenticated
      USING (
        -- Event owner
        EXISTS (
          SELECT 1 FROM public.events e
          WHERE e.id = public.volunteers.event_id AND e.created_by = auth.uid()
        )
        OR
        -- Any user shared on the event (viewer or editor)
        EXISTS (
          SELECT 1 FROM public.event_shares es
          WHERE es.event_id = public.volunteers.event_id AND es.shared_with = auth.uid()
        )
        OR
        -- POC for this event via helper (if present)
        (EXISTS (
          SELECT 1 FROM pg_proc WHERE proname = 'is_user_poc_for_event'
        ) AND public.is_user_poc_for_event(public.volunteers.event_id))
      )
      WITH CHECK (TRUE);
  END IF;
END$$;

COMMENT ON POLICY "volunteers_update_shared_or_poc" ON public.volunteers IS 'Event owner, any shared user, or POC can update volunteers (enables check-in/out by POCs).';


