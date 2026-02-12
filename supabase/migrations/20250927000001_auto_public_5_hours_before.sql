-- Auto-public events 5 hours before start time
-- This ensures events become public even if POCs forget to toggle them

-- Create function to automatically make events public 5 hours before start
CREATE OR REPLACE FUNCTION auto_make_events_public()
RETURNS void AS $$
BEGIN
  -- Update events to public if they start within 5 hours and are currently private
  UPDATE events 
  SET 
    is_public = true,
    updated_at = NOW()
  WHERE 
    status = 'published' 
    AND is_public = false
    AND start_datetime <= NOW() + INTERVAL '5 hours'
    AND start_datetime > NOW(); -- Only future events, not past ones
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run this function every hour
-- Note: This requires pg_cron extension to be enabled
-- For now, we'll create the function and can set up the cron job manually

-- Add comment explaining the function
COMMENT ON FUNCTION auto_make_events_public() IS 'Automatically sets events to public 5 hours before their start time to prevent POCs from forgetting to make events visible';
