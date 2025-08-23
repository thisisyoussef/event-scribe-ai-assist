-- Fix security vulnerability in handle_new_user function
-- This migration addresses the "Function has a role mutable search_path" security issue

-- Drop existing trigger first to avoid dependency issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the vulnerable function
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate the function with proper security measures
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, EXCLUDED.email),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate the trigger with the secure function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add comment explaining the security fix
COMMENT ON FUNCTION handle_new_user() IS 'Securely handles new user signup by creating profile entries. Uses SECURITY DEFINER and explicit search_path to prevent search path manipulation attacks.';

