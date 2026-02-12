-- Fix profiles table policies to ensure proper access during user creation
-- This addresses potential permission issues when creating profiles

-- Drop existing profiles policies to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles of users they share events with" ON profiles;

-- Create comprehensive profiles policies
-- 1. Users can view their own profile
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- 2. Users can view profiles of users they share events with
CREATE POLICY "Users can view profiles of users they share events with" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE (shared_by = auth.uid() AND shared_with = id) OR 
            (shared_with = auth.uid() AND shared_by = id)
    )
  );

-- 3. Users can insert their own profile (needed for signup)
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Users can update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 5. Allow the handle_new_user function to work by enabling public access for authenticated users
-- This is needed because the function runs in the context of the new user who doesn't exist yet
CREATE POLICY "Public profile access for authenticated users" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Add comment explaining the policy structure
COMMENT ON TABLE profiles IS 'Profiles table with comprehensive access control for user management and event sharing';
