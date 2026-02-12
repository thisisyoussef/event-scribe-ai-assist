-- Comprehensive RLS Audit and Fix
-- This migration identifies and fixes all tables with policies but disabled RLS

-- ===========================================
-- AUDIT: Find tables with policies but RLS disabled
-- ===========================================

DO $$
DECLARE
  audit_record RECORD;
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '=== RLS AUDIT REPORT ===';
  
  -- Check all tables in public schema
  FOR audit_record IN
    SELECT 
      c.relname as table_name,
      c.relrowsecurity as rls_enabled,
      c.relforcerowsecurity as rls_forced,
      (SELECT COUNT(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname) as policy_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relkind = 'r'  -- Only regular tables
    ORDER BY c.relname
  LOOP
    IF audit_record.policy_count > 0 THEN
      IF NOT audit_record.rls_enabled THEN
        RAISE WARNING 'SECURITY ISSUE: Table % has % policies but RLS is DISABLED!', 
          audit_record.table_name, audit_record.policy_count;
      ELSE
        RAISE NOTICE 'OK: Table % has RLS enabled with % policies', 
          audit_record.table_name, audit_record.policy_count;
      END IF;
    ELSE
      IF audit_record.rls_enabled THEN
        RAISE NOTICE 'INFO: Table % has RLS enabled but no policies', 
          audit_record.table_name;
      ELSE
        RAISE NOTICE 'INFO: Table % has no RLS and no policies', 
          audit_record.table_name;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '=== END AUDIT REPORT ===';
END$$;

-- ===========================================
-- FIX: Enable RLS on all tables that have policies but RLS disabled
-- ===========================================

-- Fix events table (known issue)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events FORCE ROW LEVEL SECURITY;

-- Check and fix other tables that might have the same issue
DO $$
DECLARE
  table_record RECORD;
BEGIN
  -- Find tables with policies but RLS disabled
  FOR table_record IN
    SELECT DISTINCT c.relname as table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity  -- RLS not enabled
      AND EXISTS (
        SELECT 1 FROM pg_policies p 
        WHERE p.schemaname = 'public' AND p.tablename = c.relname
      )
  LOOP
    -- Enable RLS on this table
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_record.table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_record.table_name);
    
    RAISE NOTICE 'Fixed: Enabled RLS on public.%', table_record.table_name;
  END LOOP;
END$$;

-- ===========================================
-- VERIFICATION: Confirm all fixes
-- ===========================================

DO $$
DECLARE
  verify_record RECORD;
  issues_found INTEGER := 0;
BEGIN
  RAISE NOTICE '=== RLS VERIFICATION REPORT ===';
  
  FOR verify_record IN
    SELECT 
      c.relname as table_name,
      c.relrowsecurity as rls_enabled,
      c.relforcerowsecurity as rls_forced,
      (SELECT COUNT(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname) as policy_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relkind = 'r'
      AND EXISTS (
        SELECT 1 FROM pg_policies p 
        WHERE p.schemaname = 'public' AND p.tablename = c.relname
      )
    ORDER BY c.relname
  LOOP
    IF NOT verify_record.rls_enabled THEN
      RAISE WARNING 'STILL BROKEN: Table % has % policies but RLS is still DISABLED!', 
        verify_record.table_name, verify_record.policy_count;
      issues_found := issues_found + 1;
    ELSE
      RAISE NOTICE 'FIXED: Table % now has RLS enabled with % policies', 
        verify_record.table_name, verify_record.policy_count;
    END IF;
  END LOOP;
  
  IF issues_found = 0 THEN
    RAISE NOTICE 'SUCCESS: All tables with policies now have RLS enabled!';
  ELSE
    RAISE WARNING 'WARNING: % tables still have issues', issues_found;
  END IF;
  
  RAISE NOTICE '=== END VERIFICATION REPORT ===';
END$$;






















