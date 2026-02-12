-- Migration to fix mutable search_path in update_updated_at_column
-- Fixes "Function has a role mutable search_path" security warning

-- Redefine function with empty search_path for maximum security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- NEW is a special variable available in triggers
  -- NOW() is in pg_catalog, so it works with empty search_path
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Updates updated_at timestamp. Secure: SECURITY DEFINER with search_path=''''.';

-- Verification
DO $$
DECLARE
  func_config TEXT[];
BEGIN
  -- Get the configuration settings for the function
  SELECT proconfig INTO func_config
  FROM pg_proc
  WHERE proname = 'update_updated_at_column'
    AND pronamespace = 'public'::regnamespace;

  -- Check if search_path is set to empty string
  -- In proconfig, set search_path = '' appears as "search_path=\"\""
  IF NOT ('search_path=""' = ANY(func_config)) THEN
     RAISE EXCEPTION 'Verification Failed: Function update_updated_at_column does not have an empty search_path set! Config: %', func_config;
  ELSE
     RAISE NOTICE 'Verification Passed: Function update_updated_at_column has secure search_path.';
  END IF;
END$$;
