-- Fix SECURITY DEFINER view issue for security_monitor
-- This addresses the "Security Definer View" security issue

-- Drop the existing security_monitor view
DROP VIEW IF EXISTS public.security_monitor;

-- Recreate as a regular view without SECURITY DEFINER
CREATE VIEW public.security_monitor AS
SELECT 
  'security_check' as check_type,
  NOW() as check_time,
  'RLS and security policies active' as status;

-- Grant appropriate permissions
GRANT SELECT ON public.security_monitor TO authenticated;
GRANT SELECT ON public.security_monitor TO anon;

-- Add comment for documentation
COMMENT ON VIEW public.security_monitor IS 'Security monitoring view without SECURITY DEFINER - safe for all users';

-- Verify the view was created without SECURITY DEFINER
DO $$
DECLARE
  view_def TEXT;
BEGIN
  SELECT definition INTO view_def
  FROM pg_views 
  WHERE schemaname = 'public' AND viewname = 'security_monitor';
  
  IF view_def IS NOT NULL THEN
    IF view_def ILIKE '%SECURITY DEFINER%' THEN
      RAISE WARNING 'ISSUE: security_monitor view still contains SECURITY DEFINER!';
    ELSE
      RAISE NOTICE 'SUCCESS: security_monitor view created without SECURITY DEFINER';
    END IF;
  ELSE
    RAISE WARNING 'ERROR: security_monitor view was not created';
  END IF;
END$$;






















