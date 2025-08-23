-- Fix security vulnerability in update_updated_at_column function
-- This migration addresses the "Function has a role mutable search_path" security issue

-- Drop existing triggers first to avoid dependency issues
DROP TRIGGER IF EXISTS update_event_shares_updated_at ON event_shares;
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
DROP TRIGGER IF EXISTS update_additional_details_updated_at ON additional_details;
DROP TRIGGER IF EXISTS update_pre_event_tasks_updated_at ON pre_event_tasks;
DROP TRIGGER IF EXISTS update_itineraries_updated_at ON itineraries;

-- Drop the vulnerable function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Recreate the function with proper security measures
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate all triggers with the secure function
CREATE TRIGGER update_event_shares_updated_at 
  BEFORE UPDATE ON event_shares 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at 
  BEFORE UPDATE ON events 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at 
  BEFORE UPDATE ON contacts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_additional_details_updated_at 
  BEFORE UPDATE ON additional_details 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pre_event_tasks_updated_at 
  BEFORE UPDATE ON pre_event_tasks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_itineraries_updated_at 
  BEFORE UPDATE ON itineraries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment explaining the security fix
COMMENT ON FUNCTION update_updated_at_column() IS 'Securely updates the updated_at timestamp column. Uses SECURITY DEFINER and explicit search_path to prevent search path manipulation attacks.';
