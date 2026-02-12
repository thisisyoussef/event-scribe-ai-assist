-- Fix the handle_new_user function that was incorrectly created
-- The previous migration had syntax errors in the INSERT statement

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

  -- Insert into contacts table, but only if no contact with this phone already exists
  -- This prevents duplicates when someone creates an account with a phone that's already in contacts
  IF NOT EXISTS (
    SELECT 1 FROM contacts WHERE phone = NEW.raw_user_meta_data->>'phone'
  ) THEN
    INSERT INTO contacts (name, phone, email, gender, source, user_id)
    VALUES (
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'phone',
      NEW.email,
      NEW.raw_user_meta_data->>'gender',
      'account_signup',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
