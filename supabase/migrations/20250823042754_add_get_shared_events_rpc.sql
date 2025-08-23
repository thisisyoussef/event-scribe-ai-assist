-- RPC to fetch events shared with the current user, including share metadata
-- Uses SECURITY DEFINER to avoid RLS join issues while still filtering by auth.uid()

CREATE OR REPLACE FUNCTION public.get_shared_events_with_meta()
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  location text,
  start_datetime timestamptz,
  end_datetime timestamptz,
  sms_enabled boolean,
  day_before_time text,
  day_of_time text,
  status text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  permission_level text,
  shared_by uuid,
  shared_at timestamptz
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    e.id,
    e.title,
    e.description,
    e.location,
    e.start_datetime,
    e.end_datetime,
    e.sms_enabled,
    e.day_before_time,
    e.day_of_time,
    e.status,
    e.created_by,
    e.created_at,
    e.updated_at,
    s.permission_level,
    s.shared_by,
    s.created_at AS shared_at
  FROM public.events e
  INNER JOIN public.event_shares s ON s.event_id = e.id
  WHERE s.shared_with = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_events_with_meta() TO authenticated;


