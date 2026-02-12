-- Create analytics tracking system for events
-- This migration creates tables and functions to track clicks, QR scans, and visitors

-- 1. Create analytics_tracking table
CREATE TABLE IF NOT EXISTS analytics_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tracking_type TEXT NOT NULL CHECK (tracking_type IN ('link_click', 'qr_scan', 'page_view', 'human_click')),
  visitor_id TEXT, -- Anonymous visitor identifier
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create unique visitors table for better analytics
CREATE TABLE IF NOT EXISTS analytics_visitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT UNIQUE NOT NULL,
  first_visit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_visit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_visits INTEGER DEFAULT 1,
  total_events_visited INTEGER DEFAULT 0,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  country TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_tracking_event_id ON analytics_tracking(event_id);
CREATE INDEX IF NOT EXISTS idx_analytics_tracking_type ON analytics_tracking(tracking_type);
CREATE INDEX IF NOT EXISTS idx_analytics_tracking_created_at ON analytics_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_tracking_visitor_id ON analytics_tracking(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_visitors_visitor_id ON analytics_visitors(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_visitors_first_visit ON analytics_visitors(first_visit_at);

-- 4. Create function to track analytics
CREATE OR REPLACE FUNCTION track_analytics(
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
RETURNS UUID AS $$
DECLARE
  tracking_id UUID;
  visitor_record RECORD;
BEGIN
  -- Insert tracking record
  INSERT INTO analytics_tracking (
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
    SELECT * INTO visitor_record FROM analytics_visitors WHERE visitor_id = p_visitor_id;
    
    IF visitor_record IS NULL THEN
      -- Create new visitor
      INSERT INTO analytics_visitors (
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
      UPDATE analytics_visitors SET
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to get analytics summary for an event
CREATE OR REPLACE FUNCTION get_event_analytics_summary(
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
) AS $$
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
  RETURN QUERY EXECUTE '
    SELECT 
      COUNT(*) as total_clicks,
      COUNT(*) FILTER (WHERE tracking_type = ''qr_scan'') as qr_scans,
      COUNT(*) FILTER (WHERE tracking_type = ''human_click'') as human_clicks,
      COUNT(DISTINCT visitor_id) FILTER (WHERE visitor_id IS NOT NULL) as unique_clicks,
      COUNT(DISTINCT visitor_id) FILTER (WHERE visitor_id IS NOT NULL) as visitors,
      COUNT(*) FILTER (WHERE tracking_type = ''page_view'') as page_views
    FROM analytics_tracking 
    WHERE event_id = $1' || date_filter || type_filter
    USING p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to get analytics by date range with filters
CREATE OR REPLACE FUNCTION get_analytics_with_filters(
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
) AS $$
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
  RETURN QUERY EXECUTE '
    SELECT 
      tracking_type,
      device_type,
      country,
      COUNT(*) as click_count,
      COUNT(DISTINCT visitor_id) as unique_visitors,
      DATE(created_at) as date_group
    FROM analytics_tracking 
    ' || where_clause || '
    ' || group_by_clause || '
    ORDER BY date_group DESC, click_count DESC'
    USING p_event_id, p_date_from, p_date_to, p_tracking_types, p_device_types, p_countries;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Enable RLS
ALTER TABLE analytics_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_visitors ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
-- Users can view analytics for events they created or have access to
CREATE POLICY "Users can view analytics for their events" ON analytics_tracking
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM events WHERE created_by = auth.uid()
      UNION
      SELECT event_id FROM event_shares WHERE shared_with = auth.uid()
    )
  );

-- Users can insert analytics for any event (for tracking purposes)
CREATE POLICY "Anyone can track analytics" ON analytics_tracking
  FOR INSERT WITH CHECK (true);

-- Users can view visitor data for their events
CREATE POLICY "Users can view visitors for their events" ON analytics_visitors
  FOR SELECT USING (
    visitor_id IN (
      SELECT DISTINCT visitor_id FROM analytics_tracking 
      WHERE event_id IN (
        SELECT id FROM events WHERE created_by = auth.uid()
        UNION
        SELECT event_id FROM event_shares WHERE shared_with = auth.uid()
      )
    )
  );

-- 9. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analytics_tracking_updated_at
  BEFORE UPDATE ON analytics_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_visitors_updated_at
  BEFORE UPDATE ON analytics_visitors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();





















