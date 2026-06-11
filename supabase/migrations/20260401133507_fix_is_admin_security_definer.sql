/*
  # Fix is_admin() function to use SECURITY DEFINER

  ## Problem
  The is_admin() function queries the users table, but the users table has RLS
  policies that call is_admin(), creating infinite recursion. This causes errors
  for admin users when trying to access any table whose policy checks is_admin().

  ## Fix
  Recreate is_admin() with SECURITY DEFINER so it bypasses RLS when reading
  the users table, breaking the recursion.
*/

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid())
    AND role IN ('admin', 'super_admin')
  );
END;
$$;
