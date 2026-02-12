-- Allow admins to select all profiles so creator names can be shown in admin mode

-- Ensure RLS is enabled (safe if already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Admins can view all profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Admins can view all profiles'
  ) THEN
    CREATE POLICY "Admins can view all profiles" ON profiles
      FOR SELECT USING (
        EXISTS (
          SELECT 1 
          FROM profiles AS self
          WHERE self.id = auth.uid() AND self.is_admin = TRUE
        )
      );
  END IF;
END $$;

-- Optional: broaden to all authenticated users if desired
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_policies 
--     WHERE schemaname = 'public' 
--       AND tablename = 'profiles' 
--       AND policyname = 'Authenticated users can view all profiles'
--   ) THEN
--     CREATE POLICY "Authenticated users can view all profiles" ON profiles
--       FOR SELECT USING (auth.role() = 'authenticated');
--   END IF;
-- END $$;


