-- RPC to fetch a single shared event with its roles and volunteers

CREATE OR REPLACE FUNCTION public.get_shared_event_detail(p_event_id uuid)
RETURNS TABLE (
  event jsonb,
  volunteer_roles jsonb,
  volunteers jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow access if the current user is the recipient of a share
  IF NOT EXISTS (
    SELECT 1 FROM public.event_shares s
    WHERE s.event_id = p_event_id AND s.shared_with = auth.uid()
  ) THEN
    RETURN; -- returns empty set
  END IF;

  RETURN QUERY
  SELECT 
    to_jsonb(e.*) AS event,
    COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(vr.*))
        FROM public.volunteer_roles vr
        WHERE vr.event_id = e.id
      ), '[]'::jsonb
    ) AS volunteer_roles,
    COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(v.*))
        FROM public.volunteers v
        WHERE v.event_id = e.id
      ), '[]'::jsonb
    ) AS volunteers
  FROM public.events e
  WHERE e.id = p_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_event_detail(uuid) TO authenticated;


