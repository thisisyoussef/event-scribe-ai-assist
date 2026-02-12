-- Migration to resolve SECURITY DEFINER issue for public.security_monitor view
-- This migration explicitly drops the view and recreates it WITHOUT SECURITY DEFINER

-- 1. Drop the existing view to clear any previous properties
DROP VIEW IF EXISTS public.security_monitor CASCADE;

-- 2. Recreate the view with security_invoker = true
-- This ensures the view uses the permissions of the CALLER, not the owner (definer)
CREATE VIEW public.security_monitor WITH (security_invoker = true) AS
SELECT 
  'security_check'::text as check_type,
  NOW() as check_time,
  'RLS and security policies active'::text as status,
  'safe_view'::text as view_type;

-- 3. Set explicit permissions
GRANT SELECT ON public.security_monitor TO authenticated;
GRANT SELECT ON public.security_monitor TO anon;

-- 4. Add comment to clarify security status
COMMENT ON VIEW public.security_monitor IS 'Security monitoring view (Safe: SECURITY INVOKER)';

-- 5. Verification block
DO $$
DECLARE
  view_def TEXT;
  has_security_definer BOOLEAN;
BEGIN
  SELECT definition INTO view_def
  FROM pg_views 
  WHERE schemaname = 'public' AND viewname = 'security_monitor';
  
  -- Check if view has security_invoker option set to true
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relname = 'security_monitor'
      AND 'security_invoker=true' = ANY(c.reloptions)
  ) THEN
    RAISE EXCEPTION 'Security Monitor view is missing security_invoker=true option!';
  ELSE
    RAISE NOTICE 'Verification passed: Security Monitor view has security_invoker=true.';
  END IF;
END$$;
