-- RPC to fetch events that the current user has shared with others, including share metadata
-- Uses SECURITY DEFINER to avoid RLS join issues while still filtering by auth.uid()

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
  shared_with_emails text[]
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
    ARRAY_AGG(p.email ORDER BY p.email) FILTER (WHERE p.email IS NOT NULL) AS shared_with_emails
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_events_shared_by_user() TO authenticated;
