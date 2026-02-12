-- Secure handle_new_user with explicit search_path and qualified identifiers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  -- Insert/update profile
  INSERT INTO public.profiles (id, full_name, phone, gender)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'gender')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    gender = EXCLUDED.gender;

  -- Upsert contact by phone if provided
  IF NEW.raw_user_meta_data->>'phone' IS NOT NULL AND NEW.raw_user_meta_data->>'phone' != '' THEN
    INSERT INTO public.contacts (name, phone, email, gender, source, user_id)
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
      email = COALESCE(EXCLUDED.email, public.contacts.email),
      source = 'account_signup',
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists and points to public.handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
