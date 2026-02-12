-- RPC to fetch users that the current user has previously shared events with
-- This allows quick re-sharing with previously shared users

CREATE OR REPLACE FUNCTION public.get_previously_shared_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  last_shared_at timestamptz,
  total_shares integer
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id AS user_id,
    p.email,
    p.full_name,
    MAX(s.created_at) AS last_shared_at,
    COUNT(s.id)::integer AS total_shares
  FROM public.profiles p
  INNER JOIN public.event_shares s ON s.shared_with = p.id
  WHERE s.shared_by = auth.uid()
    AND p.id != auth.uid() -- Exclude self
  GROUP BY p.id, p.email, p.full_name
  ORDER BY last_shared_at DESC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_previously_shared_users() TO authenticated;
