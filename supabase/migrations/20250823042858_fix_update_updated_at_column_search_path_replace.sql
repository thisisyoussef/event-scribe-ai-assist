-- Safer fix: replace function definition without dropping it, to avoid dependency issues

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_updated_at_column() IS 'Updates updated_at timestamp. SECURITY DEFINER with search_path=public.';


