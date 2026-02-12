-- Ensure names and emails arrays preserve the same order for toggling in UI
-- We aggregate both arrays ordered by the same key (share id), so indices match

-- Drop existing function to replace it
DROP FUNCTION IF EXISTS public.get_events_shared_by_user();

-- Recreate with aligned ordering
CREATE OR REPLACE FUNCTION public.get_events_shared_by_user()
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
  shares_count integer,
  shared_with_emails text[],
  shared_with_names text[]
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
    COUNT(s.id)::integer AS shares_count,
    ARRAY_AGG(p.email ORDER BY s.id) FILTER (WHERE p.email IS NOT NULL) AS shared_with_emails,
    ARRAY_AGG(COALESCE(p.full_name, p.email) ORDER BY s.id) FILTER (WHERE p.full_name IS NOT NULL OR p.email IS NOT NULL) AS shared_with_names
  FROM public.events e
  LEFT JOIN public.event_shares s ON s.event_id = e.id
  LEFT JOIN public.profiles p ON p.id = s.shared_with
  WHERE e.created_by = auth.uid()
    AND s.id IS NOT NULL
  GROUP BY e.id, e.title, e.description, e.location, e.start_datetime, e.end_datetime, 
           e.sms_enabled, e.day_before_time, e.day_of_time, e.status, e.created_by, 
           e.created_at, e.updated_at
  ORDER BY e.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_events_shared_by_user() TO authenticated;


