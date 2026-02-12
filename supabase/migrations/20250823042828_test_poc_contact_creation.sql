-- Test POC contact creation and add debugging
-- This migration tests the handle_new_user function behavior

-- First, let's add some debugging to see what's happening
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the incoming data
  RAISE NOTICE 'handle_new_user triggered for user: %', NEW.id;
  RAISE NOTICE 'Phone: %, Name: %, Email: %, Gender: %', 
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NEW.raw_user_meta_data->>'gender';

  -- Insert into profiles table
  INSERT INTO profiles (id, full_name, phone, gender)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'gender')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    gender = EXCLUDED.gender;

  -- Only insert into contacts if the phone is not empty
  IF NEW.raw_user_meta_data->>'phone' IS NOT NULL AND NEW.raw_user_meta_data->>'phone' != '' THEN
    RAISE NOTICE 'Attempting to insert/update contact with phone: %', NEW.raw_user_meta_data->>'phone';
    
    -- For POC accounts, we want to ensure they're in contacts with role='poc'
    -- If a contact already exists, update it to link to this user and set role='poc'
    -- If no contact exists, create a new one with role='poc'
    
    INSERT INTO contacts (name, phone, email, gender, source, user_id, role)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      NEW.raw_user_meta_data->>'phone',
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'gender', ''),
      'account_signup',
      NEW.id,
      'poc'  -- Set role to 'poc' for POC accounts
    )
    ON CONFLICT (phone) DO UPDATE SET
      -- Update existing contact to link it to this user account and set role='poc'
      name = COALESCE(EXCLUDED.name, contacts.name),  -- Update name if provided
      user_id = EXCLUDED.user_id,
      email = COALESCE(EXCLUDED.email, contacts.email),
      gender = COALESCE(EXCLUDED.gender, contacts.gender),  -- Update gender if provided
      role = 'poc',  -- Ensure role is set to 'poc' for POC accounts
      source = 'account_signup',  -- Use consistent source value
      updated_at = NOW();
      
    RAISE NOTICE 'Contact insert/update completed successfully';
  ELSE
    RAISE NOTICE 'No phone number provided, skipping contact creation';
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RAISE WARNING 'Error detail: %', SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function by creating a sample contact
-- This will help verify the logic works
DO $$
BEGIN
  -- Check if we can insert a test contact
  INSERT INTO contacts (name, phone, email, gender, source, user_id, role)
  VALUES ('Test POC', '+15551234567', 'test@example.com', 'brother', 'manual', NULL, 'poc')
  ON CONFLICT (phone) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    gender = EXCLUDED.gender,
    role = 'poc',
    source = 'manual',
    updated_at = NOW();
    
  RAISE NOTICE 'Test contact insert/update completed';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Test contact insert/update failed: %', SQLERRM;
END$$;
