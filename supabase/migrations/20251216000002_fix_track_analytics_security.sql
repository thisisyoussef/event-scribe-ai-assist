-- Migration to secure track_analytics function
-- Fixes "mutable search_path" vulnerability by enforcing empty search_path
-- and fully qualifying table names.

CREATE OR REPLACE FUNCTION public.track_analytics(
  p_event_id UUID,
  p_tracking_type TEXT,
  p_visitor_id TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL,
  p_utm_source TEXT DEFAULT NULL,
  p_utm_medium TEXT DEFAULT NULL,
  p_utm_campaign TEXT DEFAULT NULL,
  p_device_type TEXT DEFAULT NULL,
  p_browser TEXT DEFAULT NULL,
  p_os TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL
)
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  tracking_id UUID;
  visitor_record RECORD;
BEGIN
  -- Insert tracking record
  -- Uses fully qualified table name public.analytics_tracking
  INSERT INTO public.analytics_tracking (
    event_id,
    tracking_type,
    visitor_id,
    user_agent,
    ip_address,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    device_type,
    browser,
    os,
    country,
    city
  ) VALUES (
    p_event_id,
    p_tracking_type,
    p_visitor_id,
    p_user_agent,
    p_ip_address,
    p_referrer,
    p_utm_source,
    p_utm_medium,
    p_utm_campaign,
    p_device_type,
    p_browser,
    p_os,
    p_country,
    p_city
  ) RETURNING id INTO tracking_id;

  -- Update or create visitor record if visitor_id is provided
  IF p_visitor_id IS NOT NULL THEN
    -- Uses fully qualified table name public.analytics_visitors
    SELECT * INTO visitor_record FROM public.analytics_visitors WHERE visitor_id = p_visitor_id;
    
    IF visitor_record IS NULL THEN
      -- Create new visitor
      INSERT INTO public.analytics_visitors (
        visitor_id,
        device_type,
        country,
        city
      ) VALUES (
        p_visitor_id,
        p_device_type,
        p_country,
        p_city
      );
    ELSE
      -- Update existing visitor
      UPDATE public.analytics_visitors SET
        last_visit_at = NOW(),
        total_visits = total_visits + 1,
        device_type = COALESCE(p_device_type, device_type),
        country = COALESCE(p_country, country),
        city = COALESCE(p_city, city),
        updated_at = NOW()
      WHERE visitor_id = p_visitor_id;
    END IF;
  END IF;

  RETURN tracking_id;
END;
$$;

COMMENT ON FUNCTION public.track_analytics IS 'Secure analytics tracking with empty search_path';

-- Verification
DO $$
DECLARE
  func_config TEXT[];
BEGIN
  SELECT proconfig INTO func_config
  FROM pg_proc
  WHERE proname = 'track_analytics'
    AND pronamespace = 'public'::regnamespace;

  IF NOT ('search_path=""' = ANY(func_config)) THEN
     RAISE EXCEPTION 'Verification Failed: Function track_analytics does not have an empty search_path set!';
  ELSE
     RAISE NOTICE 'Verification Passed: Function track_analytics has secure search_path.';
  END IF;
END$$;
