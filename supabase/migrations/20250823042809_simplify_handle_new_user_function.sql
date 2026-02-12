-- Simplify the handle_new_user function to fix database errors
-- Remove complex logic and focus on basic functionality

DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO profiles (id, full_name, phone, gender)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'gender')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    gender = EXCLUDED.gender;

  -- Only insert into contacts if the phone is not empty
  IF NEW.raw_user_meta_data->>'phone' IS NOT NULL AND NEW.raw_user_meta_data->>'phone' != '' THEN
    -- Check if contact already exists with this phone
    IF NOT EXISTS (
      SELECT 1 FROM contacts WHERE phone = NEW.raw_user_meta_data->>'phone'
    ) THEN
      INSERT INTO contacts (name, phone, email, gender, source, user_id)
      VALUES (
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.raw_user_meta_data->>'phone',
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'gender', ''),
        'account_signup',
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
