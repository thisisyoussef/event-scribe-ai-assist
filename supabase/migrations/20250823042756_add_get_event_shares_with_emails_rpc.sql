-- RPC to fetch event shares for an event with profile emails for both sides

CREATE OR REPLACE FUNCTION public.get_event_shares_with_emails(p_event_id uuid)
RETURNS TABLE (
  id uuid,
  event_id uuid,
  shared_by uuid,
  shared_with uuid,
  permission_level text,
  created_at timestamptz,
  updated_at timestamptz,
  shared_with_email text,
  shared_by_email text,
  shared_with_full_name text,
  shared_by_full_name text
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.event_id,
    s.shared_by,
    s.shared_with,
    s.permission_level,
    s.created_at,
    s.updated_at,
    pw.email AS shared_with_email,
    pb.email AS shared_by_email,
    pw.full_name AS shared_with_full_name,
    pb.full_name AS shared_by_full_name
  FROM public.event_shares s
  LEFT JOIN public.profiles pw ON pw.id = s.shared_with
  LEFT JOIN public.profiles pb ON pb.id = s.shared_by
  WHERE s.event_id = p_event_id
    AND (
      -- only allow the owner or anyone involved in shares for this event
      EXISTS (SELECT 1 FROM public.events e WHERE e.id = p_event_id AND e.created_by = auth.uid())
      OR EXISTS (SELECT 1 FROM public.event_shares s2 WHERE s2.event_id = p_event_id AND (s2.shared_with = auth.uid() OR s2.shared_by = auth.uid()))
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_event_shares_with_emails(uuid) TO authenticated;


