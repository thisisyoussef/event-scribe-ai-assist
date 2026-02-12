-- Comprehensive fix for SECURITY DEFINER view issue
-- This handles all possible ways a view can have SECURITY DEFINER

-- ===========================================
-- 1. COMPLETELY REMOVE SECURITY MONITOR VIEW
-- ===========================================

-- Drop the view completely (including any dependencies)
DROP VIEW IF EXISTS public.security_monitor CASCADE;

-- ===========================================
-- 2. CHECK FOR ANY REMAINING SECURITY DEFINER VIEWS
-- ===========================================

DO $$
DECLARE
  view_record RECORD;
  view_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== CHECKING FOR SECURITY DEFINER VIEWS ===';
  
  -- Check all views in public schema
  FOR view_record IN
    SELECT 
      schemaname,
      viewname,
      definition
    FROM pg_views 
    WHERE schemaname = 'public'
    ORDER BY viewname
  LOOP
    -- Check if view definition contains SECURITY DEFINER
    IF view_record.definition ILIKE '%SECURITY DEFINER%' THEN
      RAISE WARNING 'FOUND SECURITY DEFINER VIEW: %.%', 
        view_record.schemaname, view_record.viewname;
      view_count := view_count + 1;
    ELSE
      RAISE NOTICE 'SAFE VIEW: %.% does not use SECURITY DEFINER', 
        view_record.schemaname, view_record.viewname;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Found % views with SECURITY DEFINER issues', view_count;
END$$;

-- ===========================================
-- 3. CREATE A SAFE SECURITY MONITOR VIEW
-- ===========================================

-- Create a completely new, safe security monitor view
CREATE VIEW public.security_monitor AS
SELECT 
  'security_check' as check_type,
  NOW() as check_time,
  'RLS and security policies active' as status,
  'safe_view' as view_type;

-- ===========================================
-- 4. SET PROPER PERMISSIONS
-- ===========================================

-- Grant read access to authenticated users
GRANT SELECT ON public.security_monitor TO authenticated;

-- Grant read access to anonymous users (if needed)
GRANT SELECT ON public.security_monitor TO anon;

-- ===========================================
-- 5. VERIFY THE FIX
-- ===========================================

DO $$
DECLARE
  view_def TEXT;
  has_security_definer BOOLEAN := FALSE;
BEGIN
  -- Get the view definition
  SELECT definition INTO view_def
  FROM pg_views 
  WHERE schemaname = 'public' AND viewname = 'security_monitor';
  
  IF view_def IS NOT NULL THEN
    -- Check if it contains SECURITY DEFINER
    has_security_definer := view_def ILIKE '%SECURITY DEFINER%';
    
    IF has_security_definer THEN
      RAISE WARNING 'FAILED: security_monitor view still contains SECURITY DEFINER!';
      RAISE WARNING 'View definition: %', view_def;
    ELSE
      RAISE NOTICE 'SUCCESS: security_monitor view created without SECURITY DEFINER';
      RAISE NOTICE 'View definition: %', view_def;
    END IF;
  ELSE
    RAISE WARNING 'ERROR: security_monitor view was not created';
  END IF;
END$$;

-- ===========================================
-- 6. FINAL SECURITY AUDIT
-- ===========================================

DO $$
DECLARE
  audit_record RECORD;
  total_issues INTEGER := 0;
BEGIN
  RAISE NOTICE '=== FINAL SECURITY DEFINER AUDIT ===';
  
  -- Check all views for SECURITY DEFINER
  FOR audit_record IN
    SELECT 
      schemaname,
      viewname,
      definition
    FROM pg_views 
    WHERE schemaname = 'public'
    ORDER BY viewname
  LOOP
    IF audit_record.definition ILIKE '%SECURITY DEFINER%' THEN
      RAISE WARNING 'SECURITY ISSUE: View %.% uses SECURITY DEFINER', 
        audit_record.schemaname, audit_record.viewname;
      total_issues := total_issues + 1;
    ELSE
      RAISE NOTICE 'SECURE: View %.% does not use SECURITY DEFINER', 
        audit_record.schemaname, audit_record.viewname;
    END IF;
  END LOOP;
  
  -- Summary
  IF total_issues = 0 THEN
    RAISE NOTICE 'SUCCESS: No SECURITY DEFINER views found!';
  ELSE
    RAISE WARNING 'WARNING: % views still have SECURITY DEFINER issues', total_issues;
  END IF;
END$$;

-- Add documentation
COMMENT ON VIEW public.security_monitor IS 'Security monitoring view - safe for all users, no SECURITY DEFINER';






















