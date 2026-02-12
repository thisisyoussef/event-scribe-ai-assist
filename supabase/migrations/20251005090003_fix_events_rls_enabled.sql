-- Fix RLS enabled on public.events table
-- This addresses the "Policy Exists RLS Disabled" security issue

-- Enable RLS on events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Optional: Force RLS to prevent bypass by table owner
ALTER TABLE public.events FORCE ROW LEVEL SECURITY;

-- Verify RLS is enabled
DO $$
DECLARE
  rls_enabled BOOLEAN;
  rls_forced BOOLEAN;
BEGIN
  SELECT relrowsecurity, relforcerowsecurity 
  INTO rls_enabled, rls_forced
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'events';
  
  IF rls_enabled THEN
    RAISE NOTICE 'RLS successfully enabled on public.events';
    IF rls_forced THEN
      RAISE NOTICE 'RLS is also FORCED on public.events (prevents owner bypass)';
    END IF;
  ELSE
    RAISE WARNING 'RLS may not be enabled on public.events';
  END IF;
END$$;

-- Check existing policies on events table
DO $$
DECLARE
  policy_count INTEGER;
  policy_record RECORD;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'events';
  
  RAISE NOTICE 'Found % existing policies on public.events:', policy_count;
  
  FOR policy_record IN
    SELECT policyname, permissive, roles, cmd
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'events'
    ORDER BY policyname
  LOOP
    RAISE NOTICE 'Policy: % (Command: %, Permissive: %, Roles: %)', 
      policy_record.policyname, 
      policy_record.cmd, 
      policy_record.permissive,
      policy_record.roles;
  END LOOP;
END$$;

-- Add comment for documentation
COMMENT ON TABLE public.events IS 'Events table with RLS enabled and policies active';






















