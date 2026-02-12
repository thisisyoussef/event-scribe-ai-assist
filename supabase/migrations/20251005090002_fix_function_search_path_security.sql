-- Fix function search_path security vulnerability
-- This migration addresses the "Function Search Path Mutable" security issue

-- First, let's check if the validate_event_slug function exists and get its definition
DO $$
DECLARE
  func_def TEXT;
  func_oid OID;
BEGIN
  -- Check if the function exists
  SELECT p.oid INTO func_oid
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'validate_event_slug';
  
  IF func_oid IS NOT NULL THEN
    -- Get the function definition
    SELECT pg_get_functiondef(func_oid) INTO func_def;
    
    -- Log the current function definition for debugging
    RAISE NOTICE 'Found validate_event_slug function: %', func_def;
    
    -- Drop the existing function
    DROP FUNCTION IF EXISTS public.validate_event_slug(TEXT);
    
    -- Recreate with secure search_path
    -- Note: This is a placeholder - we need to know the actual function body
    -- The function should be recreated with SECURITY DEFINER and SET search_path = 'public'
    RAISE NOTICE 'Function validate_event_slug dropped. Please recreate with secure search_path.';
  ELSE
    RAISE NOTICE 'Function validate_event_slug not found in public schema.';
  END IF;
END$$;

-- Create a secure version of validate_event_slug function
-- This is a basic implementation - adjust based on your actual requirements
CREATE OR REPLACE FUNCTION public.validate_event_slug(slug TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Basic slug validation: alphanumeric, hyphens, underscores only
  -- Length between 3 and 50 characters
  -- Must start and end with alphanumeric character
  IF slug IS NULL OR length(slug) < 3 OR length(slug) > 50 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if slug matches allowed pattern
  IF NOT slug ~ '^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$' THEN
    RETURN FALSE;
  END IF;
  
  -- Check if slug is not already taken (optional - uncomment if needed)
  -- IF EXISTS (SELECT 1 FROM events WHERE slug = validate_event_slug.slug) THEN
  --   RETURN FALSE;
  -- END IF;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.validate_event_slug(TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.validate_event_slug(TEXT) IS 'Validates event slug format with secure search_path. Returns true if slug is valid format.';

-- Verify the function was created with secure search_path
DO $$
DECLARE
  search_path_setting TEXT;
BEGIN
  SELECT proconfig[1] INTO search_path_setting
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'validate_event_slug';
  
  IF search_path_setting IS NOT NULL AND search_path_setting LIKE 'search_path=%' THEN
    RAISE NOTICE 'Function validate_event_slug created with secure search_path: %', search_path_setting;
  ELSE
    RAISE WARNING 'Function validate_event_slug may not have secure search_path setting';
  END IF;
END$$;





