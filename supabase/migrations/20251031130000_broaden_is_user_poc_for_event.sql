-- Broaden POC detection to also match by profile email, not only contacts.user_id
-- This helps when a POC contact exists without a user_id link, but emails match

CREATE OR REPLACE FUNCTION public.is_user_poc_for_event(p_event_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE sql
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM public.contacts c
    LEFT JOIN public.profiles p ON p.id = auth.uid()
    WHERE c.role = 'poc'
      AND (
        c.user_id = auth.uid() -- direct mapping
        OR (p.email IS NOT NULL AND c.email = p.email) -- fallback by email match
      )
      AND EXISTS (
        SELECT 1
        FROM public.volunteer_roles vr
        WHERE vr.event_id = p_event_id
          AND (
            (pg_typeof(vr.suggested_poc) = 'text[]'::regtype AND vr.suggested_poc @> ARRAY[c.id::text])
            OR (pg_typeof(vr.suggested_poc) = 'text'::regtype AND ARRAY[vr.suggested_poc::text] @> ARRAY[c.id::text])
          )
      )
  );
$fn$;

REVOKE ALL ON FUNCTION public.is_user_poc_for_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_poc_for_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_poc_for_event(uuid) TO service_role;


