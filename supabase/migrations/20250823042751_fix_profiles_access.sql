-- Fix profiles access and add user signup trigger
-- This migration adds policies to allow viewing profiles of users we share events with
-- and automatically creates profile entries when users sign up

-- Add policy to allow viewing profiles of users we share events with
DROP POLICY IF EXISTS "Users can view profiles of users they share events with" ON profiles;
CREATE POLICY "Users can view profiles of users they share events with" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_shares 
      WHERE (shared_by = auth.uid() AND shared_with = id) OR 
            (shared_with = auth.uid() AND shared_by = id)
    )
  );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, EXCLUDED.email),
    updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
