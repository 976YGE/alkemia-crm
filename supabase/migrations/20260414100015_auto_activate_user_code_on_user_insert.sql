/*
  # Auto-activate user code when a user account is created

  1. Changes
    - Creates a trigger function that automatically sets `is_activated = true`
      and `activated_at = now()` on `user_codes` when a new row is inserted into `users`
    - This ensures the activation status is always consistent, even if the
      client-side update fails due to RLS timing issues

  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Only triggered on INSERT into users table
*/

CREATE OR REPLACE FUNCTION public.auto_activate_user_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_codes
  SET is_activated = true,
      activated_at = COALESCE(activated_at, now())
  WHERE id = NEW.user_code_id
    AND is_activated = false;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_activate_user_code'
  ) THEN
    CREATE TRIGGER trg_auto_activate_user_code
      AFTER INSERT ON public.users
      FOR EACH ROW
      EXECUTE FUNCTION public.auto_activate_user_code();
  END IF;
END $$;
