-- Resilient handle_new_user: bypass RLS within function and fully qualify objects
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_phone text;
  v_name text;
  v_email text;
  v_gender text;
BEGIN
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_email := COALESCE(NEW.email, '');
  v_gender := COALESCE(NEW.raw_user_meta_data->>'gender', '');

  -- Ensure RLS won't block these writes inside this transaction
  PERFORM set_config('row_security', 'off', true);

  -- Upsert profile
  INSERT INTO public.profiles (id, full_name, phone, gender)
  VALUES (NEW.id, v_name, v_phone, v_gender)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    gender = EXCLUDED.gender;

  -- Upsert contact if phone present
  IF v_phone IS NOT NULL AND v_phone <> '' THEN
    INSERT INTO public.contacts (name, phone, email, gender, source, user_id, role)
    VALUES (v_name, v_phone, v_email, v_gender, 'account_signup', NEW.id, 'poc')
    ON CONFLICT (phone) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, public.contacts.name),
      user_id = EXCLUDED.user_id,
      email = COALESCE(EXCLUDED.email, public.contacts.email),
      gender = COALESCE(EXCLUDED.gender, public.contacts.gender),
      role = 'poc',
      source = 'account_signup',
      updated_at = NOW();
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never fail signup due to downstream writes
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Rebind trigger to public.handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
