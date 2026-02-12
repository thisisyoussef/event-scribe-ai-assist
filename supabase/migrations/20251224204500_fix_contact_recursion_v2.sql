-- Recursive RLS Fix V2: Isolate contacts policies using SECURITY DEFINER functions.
-- This ensures that checks on 'contacts' do not trigger RLS on 'events' or 'volunteer_roles',
-- preventing any potential recursion loop regardless of policies on those tables.

-- 1. Helper function to check if a user owns a published event (bypassing RLS)
CREATE OR REPLACE FUNCTION public.check_user_owns_published_event(target_user_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.created_by = target_user_id
      AND e.status = 'published'
      AND COALESCE(e.is_public, false) = true
      AND e.deleted_at IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_user_owns_published_event(uuid) TO anon, authenticated, service_role;

-- 2. Helper function to check if a contact is referenced in roles of a published event (bypassing RLS)
CREATE OR REPLACE FUNCTION public.contact_is_referenced_in_public_events(contact_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.volunteer_roles vr
    JOIN public.events e ON e.id = vr.event_id
    WHERE e.status = 'published'
      AND COALESCE(e.is_public, false) = true
      AND e.deleted_at IS NULL
      AND vr.suggested_poc IS NOT NULL
      AND (
        (pg_typeof(vr.suggested_poc) = 'text[]'::regtype AND vr.suggested_poc @> ARRAY[contact_id::text])
        OR (pg_typeof(vr.suggested_poc) = 'text'::regtype AND ARRAY[vr.suggested_poc::text] @> ARRAY[contact_id::text])
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.contact_is_referenced_in_public_events(uuid) TO anon, authenticated, service_role;

-- 3. Replace problematic contacts policies with versions using the safe functions

-- Drop existing policies
DROP POLICY IF EXISTS "contacts_insert_for_public_published_event_owners_authenticated" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert_for_public_published_event_owners_anon" ON public.contacts;
DROP POLICY IF EXISTS "contacts_select_for_public_published_event_owners_authenticated" ON public.contacts;
DROP POLICY IF EXISTS "contacts_select_for_public_published_event_owners_anon" ON public.contacts;
DROP POLICY IF EXISTS "contacts_public_select_for_published_public_events" ON public.contacts;

-- Re-create policies using SECURITY DEFINER functions

-- Authenticated Insert
CREATE POLICY "contacts_insert_for_public_published_event_owners_authenticated" ON public.contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.check_user_owns_published_event(contacts.user_id)
  );

-- Anon Insert
CREATE POLICY "contacts_insert_for_public_published_event_owners_anon" ON public.contacts
  FOR INSERT
  TO anon
  WITH CHECK (
    public.check_user_owns_published_event(contacts.user_id)
  );

-- Authenticated Select
CREATE POLICY "contacts_select_for_public_published_event_owners_authenticated" ON public.contacts
  FOR SELECT
  TO authenticated
  USING (
    public.check_user_owns_published_event(contacts.user_id)
  );

-- Anon Select
CREATE POLICY "contacts_select_for_public_published_event_owners_anon" ON public.contacts
  FOR SELECT
  TO anon
  USING (
    public.check_user_owns_published_event(contacts.user_id)
  );

-- Public Select (referenced contacts)
CREATE POLICY "contacts_public_select_for_published_public_events" ON public.contacts
  FOR SELECT
  TO anon
  USING (
    public.contact_is_referenced_in_public_events(contacts.id)
  );


-- 4. Cleanup potentially recursive policies on other tables (Just to be safe, redundant if V1 ran)
DROP POLICY IF EXISTS "events_select_poc_access" ON public.events;
DROP POLICY IF EXISTS "events_update_poc_access" ON public.events;
DROP POLICY IF EXISTS "volunteer_roles_select_poc_access" ON public.volunteer_roles;
DROP POLICY IF EXISTS "volunteer_roles_write_poc_access" ON public.volunteer_roles;
DROP POLICY IF EXISTS "volunteers_poc_full_access" ON public.volunteers;
