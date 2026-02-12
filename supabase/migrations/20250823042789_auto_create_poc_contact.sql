-- Auto-create POC contact when user signs up
-- This automatically creates a contact entry for new POC users based on their signup information

-- Update the handle_new_user function to also create a contact entry
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile entry
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
  
  -- Auto-create POC contact entry
  INSERT INTO contacts (
    user_id,
    name,
    phone,
    gender,
    source,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.raw_user_meta_data->>'gender',
    'manual',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, phone) DO UPDATE SET
    name = EXCLUDED.name,
    gender = EXCLUDED.gender,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Add comment explaining the enhanced functionality
COMMENT ON FUNCTION handle_new_user() IS 'Handles new user signup by creating profile entries and automatically creating POC contact entries with gender information';
