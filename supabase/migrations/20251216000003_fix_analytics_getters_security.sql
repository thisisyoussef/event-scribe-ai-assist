-- Migration to secure analytics getter functions
-- Fixes "mutable search_path" vulnerability in:
-- 1. get_event_analytics_summary
-- 2. get_analytics_with_filters

-- 1. Fix get_event_analytics_summary
CREATE OR REPLACE FUNCTION public.get_event_analytics_summary(
  p_event_id UUID,
  p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_tracking_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_clicks BIGINT,
  qr_scans BIGINT,
  human_clicks BIGINT,
  unique_clicks BIGINT,
  visitors BIGINT,
  page_views BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  date_filter TEXT := '';
  type_filter TEXT := '';
BEGIN
  -- Build date filter
  IF p_date_from IS NOT NULL AND p_date_to IS NOT NULL THEN
    date_filter := ' AND created_at BETWEEN ''' || p_date_from || ''' AND ''' || p_date_to || '''';
  ELSIF p_date_from IS NOT NULL THEN
    date_filter := ' AND created_at >= ''' || p_date_from || '''';
  ELSIF p_date_to IS NOT NULL THEN
    date_filter := ' AND created_at <= ''' || p_date_to || '''';
  END IF;

  -- Build type filter
  IF p_tracking_type IS NOT NULL THEN
    type_filter := ' AND tracking_type = ''' || p_tracking_type || '''';
  END IF;

  -- Execute dynamic query
  -- IMPORTANT: Used public.analytics_tracking in the dynamic string
  RETURN QUERY EXECUTE '
    SELECT 
      COUNT(*) as total_clicks,
      COUNT(*) FILTER (WHERE tracking_type = ''qr_scan'') as qr_scans,
      COUNT(*) FILTER (WHERE tracking_type = ''human_click'') as human_clicks,
      COUNT(DISTINCT visitor_id) FILTER (WHERE visitor_id IS NOT NULL) as unique_clicks,
      COUNT(DISTINCT visitor_id) FILTER (WHERE visitor_id IS NOT NULL) as visitors,
      COUNT(*) FILTER (WHERE tracking_type = ''page_view'') as page_views
    FROM public.analytics_tracking 
    WHERE event_id = $1' || date_filter || type_filter
    USING p_event_id;
END;
$$;

COMMENT ON FUNCTION public.get_event_analytics_summary IS 'Secure event analytics summary with empty search_path';


-- 2. Fix get_analytics_with_filters
CREATE OR REPLACE FUNCTION public.get_analytics_with_filters(
  p_event_id UUID,
  p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_tracking_types TEXT[] DEFAULT NULL,
  p_device_types TEXT[] DEFAULT NULL,
  p_countries TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  tracking_type TEXT,
  device_type TEXT,
  country TEXT,
  click_count BIGINT,
  unique_visitors BIGINT,
  date_group DATE
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  where_clause TEXT := 'WHERE event_id = $1';
  group_by_clause TEXT := 'GROUP BY tracking_type, device_type, country, DATE(created_at)';
BEGIN
  -- Add date filters
  IF p_date_from IS NOT NULL AND p_date_to IS NOT NULL THEN
    where_clause := where_clause || ' AND created_at BETWEEN $2 AND $3';
  ELSIF p_date_from IS NOT NULL THEN
    where_clause := where_clause || ' AND created_at >= $2';
  ELSIF p_date_to IS NOT NULL THEN
    where_clause := where_clause || ' AND created_at <= $2';
  END IF;

  -- Add tracking type filters
  IF p_tracking_types IS NOT NULL AND array_length(p_tracking_types, 1) > 0 THEN
    where_clause := where_clause || ' AND tracking_type = ANY($' || 
      CASE 
        WHEN p_date_from IS NOT NULL AND p_date_to IS NOT NULL THEN '4'
        WHEN p_date_from IS NOT NULL OR p_date_to IS NOT NULL THEN '3'
        ELSE '2'
      END || ')';
  END IF;

  -- Add device type filters
  IF p_device_types IS NOT NULL AND array_length(p_device_types, 1) > 0 THEN
    where_clause := where_clause || ' AND device_type = ANY($' || 
      CASE 
        WHEN p_date_from IS NOT NULL AND p_date_to IS NOT NULL THEN '5'
        WHEN p_date_from IS NOT NULL OR p_date_to IS NOT NULL THEN '4'
        WHEN p_tracking_types IS NOT NULL THEN '3'
        ELSE '2'
      END || ')';
  END IF;

  -- Add country filters
  IF p_countries IS NOT NULL AND array_length(p_countries, 1) > 0 THEN
    where_clause := where_clause || ' AND country = ANY($' || 
      CASE 
        WHEN p_date_from IS NOT NULL AND p_date_to IS NOT NULL THEN '6'
        WHEN p_date_from IS NOT NULL OR p_date_to IS NOT NULL THEN '5'
        WHEN p_tracking_types IS NOT NULL THEN '4'
        WHEN p_device_types IS NOT NULL THEN '3'
        ELSE '2'
      END || ')';
  END IF;

  -- Execute dynamic query
  -- IMPORTANT: Used public.analytics_tracking in the dynamic string
  RETURN QUERY EXECUTE '
    SELECT 
      tracking_type,
      device_type,
      country,
      COUNT(*) as click_count,
      COUNT(DISTINCT visitor_id) as unique_visitors,
      DATE(created_at) as date_group
    FROM public.analytics_tracking 
    ' || where_clause || '
    ' || group_by_clause || '
    ORDER BY date_group DESC, click_count DESC'
    USING p_event_id, p_date_from, p_date_to, p_tracking_types, p_device_types, p_countries;
END;
$$;

COMMENT ON FUNCTION public.get_analytics_with_filters IS 'Secure analytics details with empty search_path';

-- Verification
DO $$
DECLARE
  func1_config TEXT[];
  func2_config TEXT[];
BEGIN
  -- Check function 1
  SELECT proconfig INTO func1_config
  FROM pg_proc
  WHERE proname = 'get_event_analytics_summary'
    AND pronamespace = 'public'::regnamespace;

  IF NOT ('search_path=""' = ANY(func1_config)) THEN
     RAISE EXCEPTION 'Verification Failed: Function get_event_analytics_summary does not have an empty search_path set!';
  END IF;

  -- Check function 2
  SELECT proconfig INTO func2_config
  FROM pg_proc
  WHERE proname = 'get_analytics_with_filters'
    AND pronamespace = 'public'::regnamespace;

  IF NOT ('search_path=""' = ANY(func2_config)) THEN
     RAISE EXCEPTION 'Verification Failed: Function get_analytics_with_filters does not have an empty search_path set!';
  END IF;

  RAISE NOTICE 'Verification Passed: Analytics getter functions have secure search_path.';
END$$;
