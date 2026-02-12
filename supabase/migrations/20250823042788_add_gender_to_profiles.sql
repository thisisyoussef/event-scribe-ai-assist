-- Add gender field to profiles table
-- This allows users to specify brother/sister during account creation

-- Add gender column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('brother', 'sister'));

-- Update the handle_new_user function to capture gender from user metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, gender)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'gender'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, EXCLUDED.email),
    gender = COALESCE(EXCLUDED.gender, profiles.gender),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add comment explaining the gender field
COMMENT ON COLUMN profiles.gender IS 'User gender selection: brother or sister';
COMMENT ON FUNCTION handle_new_user() IS 'Handles new user signup by creating profile entries with gender information';
