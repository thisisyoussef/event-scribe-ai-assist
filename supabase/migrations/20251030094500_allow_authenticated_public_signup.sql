-- Allow authenticated users to sign up for volunteers on published & public events
-- Fixes scenario where a cached login makes the session "authenticated", so anon policy doesn't apply

-- Ensure RLS is enabled (defensive)
ALTER TABLE IF EXISTS public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;

-- Ensure the authenticated role has the necessary table privilege (RLS still governs rows)
GRANT INSERT ON TABLE public.volunteers TO authenticated;

-- Policy: authenticated users can INSERT volunteers when event is published, public, not deleted
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'volunteers' AND policyname = 'volunteers_public_insert_for_published_public_events_authenticated'
  ) THEN
    CREATE POLICY "volunteers_public_insert_for_published_public_events_authenticated" ON public.volunteers
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.events e
          WHERE e.id = public.volunteers.event_id
            AND e.status = 'published'
            AND COALESCE(e.is_public, false) = true
            AND e.deleted_at IS NULL
        )
      );
  END IF;
END$$;

COMMENT ON POLICY "volunteers_public_insert_for_published_public_events_authenticated" ON public.volunteers
  IS 'Authenticated users can insert signups for published & public events (mirrors anon policy).';


