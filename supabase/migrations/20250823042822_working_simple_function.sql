-- Working simple version of the function
-- This should work without syntax errors

-- Drop all existing policies and recreate them properly
DROP POLICY IF EXISTS "Enable read access for all users" ON contacts;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON contacts;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON contacts;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON contacts;

-- Create comprehensive RLS policies that work for all scenarios
-- Allow public read access to all contacts (needed for signup flow)
CREATE POLICY "Enable read access for all users" ON contacts
  FOR SELECT USING (true);

-- Allow authenticated users to insert contacts
CREATE POLICY "Enable insert for authenticated users only" ON contacts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update contacts they created
CREATE POLICY "Enable update for users based on user_id" ON contacts
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Allow users to delete contacts they created
CREATE POLICY "Enable delete for users based on user_id" ON contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Create a very simple, working function
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

  -- Insert into contacts if phone exists
  IF NEW.raw_user_meta_data->>'phone' IS NOT NULL AND NEW.raw_user_meta_data->>'phone' != '' THEN
    -- Try to insert, if it fails due to duplicate phone, update instead
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
      user_id = EXCLUDED.user_id,
      email = COALESCE(EXCLUDED.email, contacts.email),
      source = 'account_signup',
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO anon;

-- Test basic functionality
DO $$
BEGIN
  RAISE NOTICE 'Testing basic functionality...';
  
  -- Test 1: Can we query contacts?
  PERFORM COUNT(*) FROM contacts LIMIT 1;
  RAISE NOTICE 'SUCCESS: Can query contacts table';
  
  -- Test 2: Can we insert a test contact?
  INSERT INTO contacts (name, phone, email, gender, source, user_id) 
  VALUES ('TEST_USER_1', '+1234567890', 'test1@test.com', 'brother', 'account_signup', '00000000-0000-0000-0000-000000000000');
  RAISE NOTICE 'SUCCESS: Can insert test contact';
  
  -- Clean up test data
  DELETE FROM contacts WHERE phone = '+1234567890';
  RAISE NOTICE 'Successfully cleaned up test contact';
  
  RAISE NOTICE 'Basic functionality test completed successfully';
END $$;
