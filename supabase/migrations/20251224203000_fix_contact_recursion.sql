-- Fix infinite recursion by removing policies on events and volunteer_roles that query contacts directly.
-- These policies create a cycle: contacts -> events -> (volunteer_roles) -> contacts.
-- They are superseded by safer policies using SECURITY DEFINER functions (user_is_poc) or broader access.

-- Drop recursive events policies
DROP POLICY IF EXISTS "events_select_poc_access" ON public.events;
DROP POLICY IF EXISTS "events_update_poc_access" ON public.events;

-- Drop recursive volunteer_roles policies (superseded by volunteer_roles_poc_* policies)
DROP POLICY IF EXISTS "volunteer_roles_select_poc_access" ON public.volunteer_roles;
DROP POLICY IF EXISTS "volunteer_roles_write_poc_access" ON public.volunteer_roles;

-- Drop recursive volunteers policies
DROP POLICY IF EXISTS "volunteers_poc_full_access" ON public.volunteers;

-- Drop recursive policies on other tables
DROP POLICY IF EXISTS "additional_details_poc_full_access" ON public.additional_details;
DROP POLICY IF EXISTS "pre_event_tasks_poc_full_access" ON public.pre_event_tasks;
DROP POLICY IF EXISTS "itineraries_poc_full_access" ON public.itineraries;
