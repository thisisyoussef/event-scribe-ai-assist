-- Fix POC contact creation logic
-- Ensure POC accounts always get added to contacts table, even if they already exist

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
    -- For POC accounts, we want to ensure they're in contacts
    -- If a contact already exists, update it to link to this user
    -- If no contact exists, create a new one
    
    INSERT INTO contacts (name, phone, email, gender, source, user_id)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.raw_user_meta_data->>'phone',
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'gender', ''),
      'account_signup',
      NEW.id
    )
    ON CONFLICT (phone) DO UPDATE SET
      -- Update existing contact to link it to this user account
      user_id = EXCLUDED.user_id,
      email = COALESCE(EXCLUDED.email, contacts.email),
      source = CASE 
        WHEN contacts.source = 'manual' THEN 'manual_and_account'
        WHEN contacts.source = 'volunteer_signup' THEN 'volunteer_and_account'
        ELSE EXCLUDED.source
      END,
      updated_at = NOW();
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
