-- Simplify volunteer_roles RLS to break recursion with events policies.
-- Remove any dependency on public.events; rely on event_shares and POC checks only.

DO $$
BEGIN
  -- SELECT: viewer is editor/share on event OR is POC on this role
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteer_roles' AND policyname='volunteer_roles_select_owned_or_shared'
  ) THEN
    ALTER POLICY "volunteer_roles_select_owned_or_shared" ON public.volunteer_roles
      USING (
        EXISTS (
          SELECT 1 FROM public.event_shares es
          WHERE es.event_id = public.volunteer_roles.event_id
            AND es.shared_with = auth.uid()
        ) OR EXISTS (
          SELECT 1 FROM public.contacts c
          WHERE c.role = 'poc' AND c.user_id = auth.uid()
            AND (
              (pg_typeof(public.volunteer_roles.suggested_poc) = 'text[]'::regtype AND public.volunteer_roles.suggested_poc @> ARRAY[c.id::text])
              OR (pg_typeof(public.volunteer_roles.suggested_poc) = 'text'::regtype AND ARRAY[public.volunteer_roles.suggested_poc::text] @> ARRAY[c.id::text])
            )
        )
      );
  END IF;

  -- INSERT: editor share on event OR POC for this event (role-level)
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteer_roles' AND policyname='volunteer_roles_insert_owned_or_edit_shared'
  ) THEN
    ALTER POLICY "volunteer_roles_insert_owned_or_edit_shared" ON public.volunteer_roles
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.event_shares es
          WHERE es.event_id = public.volunteer_roles.event_id
            AND es.shared_with = auth.uid()
            AND es.permission_level = 'edit'
        ) OR EXISTS (
          SELECT 1 FROM public.contacts c
          WHERE c.role = 'poc' AND c.user_id = auth.uid()
            AND (
              (pg_typeof(public.volunteer_roles.suggested_poc) = 'text[]'::regtype AND public.volunteer_roles.suggested_poc @> ARRAY[c.id::text])
              OR (pg_typeof(public.volunteer_roles.suggested_poc) = 'text'::regtype AND ARRAY[public.volunteer_roles.suggested_poc::text] @> ARRAY[c.id::text])
            )
        )
      );
  END IF;

  -- UPDATE: editor share on event OR POC
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteer_roles' AND policyname='volunteer_roles_update_owned_or_edit_shared'
  ) THEN
    ALTER POLICY "volunteer_roles_update_owned_or_edit_shared" ON public.volunteer_roles
      USING (
        EXISTS (
          SELECT 1 FROM public.event_shares es
          WHERE es.event_id = public.volunteer_roles.event_id
            AND es.shared_with = auth.uid()
            AND es.permission_level = 'edit'
        ) OR EXISTS (
          SELECT 1 FROM public.contacts c
          WHERE c.role = 'poc' AND c.user_id = auth.uid()
            AND (
              (pg_typeof(public.volunteer_roles.suggested_poc) = 'text[]'::regtype AND public.volunteer_roles.suggested_poc @> ARRAY[c.id::text])
              OR (pg_typeof(public.volunteer_roles.suggested_poc) = 'text'::regtype AND ARRAY[public.volunteer_roles.suggested_poc::text] @> ARRAY[c.id::text])
            )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.event_shares es
          WHERE es.event_id = public.volunteer_roles.event_id
            AND es.shared_with = auth.uid()
            AND es.permission_level = 'edit'
        ) OR EXISTS (
          SELECT 1 FROM public.contacts c
          WHERE c.role = 'poc' AND c.user_id = auth.uid()
            AND (
              (pg_typeof(public.volunteer_roles.suggested_poc) = 'text[]'::regtype AND public.volunteer_roles.suggested_poc @> ARRAY[c.id::text])
              OR (pg_typeof(public.volunteer_roles.suggested_poc) = 'text'::regtype AND ARRAY[public.volunteer_roles.suggested_poc::text] @> ARRAY[c.id::text])
            )
        )
      );
  END IF;

  -- DELETE: editor share on event OR POC
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='volunteer_roles' AND policyname='volunteer_roles_delete_owned_or_edit_shared'
  ) THEN
    ALTER POLICY "volunteer_roles_delete_owned_or_edit_shared" ON public.volunteer_roles
      USING (
        EXISTS (
          SELECT 1 FROM public.event_shares es
          WHERE es.event_id = public.volunteer_roles.event_id
            AND es.shared_with = auth.uid()
            AND es.permission_level = 'edit'
        ) OR EXISTS (
          SELECT 1 FROM public.contacts c
          WHERE c.role = 'poc' AND c.user_id = auth.uid()
            AND (
              (pg_typeof(public.volunteer_roles.suggested_poc) = 'text[]'::regtype AND public.volunteer_roles.suggested_poc @> ARRAY[c.id::text])
              OR (pg_typeof(public.volunteer_roles.suggested_poc) = 'text'::regtype AND ARRAY[public.volunteer_roles.suggested_poc::text] @> ARRAY[c.id::text])
            )
        )
      );
  END IF;
END$$;

COMMENT ON POLICY "volunteer_roles_select_owned_or_shared" ON public.volunteer_roles IS 'Viewer is shared on event or is POC for the role (no events join)';
COMMENT ON POLICY "volunteer_roles_insert_owned_or_edit_shared" ON public.volunteer_roles IS 'Editor share or POC for role (no events join)';
COMMENT ON POLICY "volunteer_roles_update_owned_or_edit_shared" ON public.volunteer_roles IS 'Editor share or POC for role (no events join)';
COMMENT ON POLICY "volunteer_roles_delete_owned_or_edit_shared" ON public.volunteer_roles IS 'Editor share or POC for role (no events join)';


