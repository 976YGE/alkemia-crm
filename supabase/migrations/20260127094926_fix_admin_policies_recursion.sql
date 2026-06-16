/*
  # Fix infinite recursion in admin policies

  1. Changes
    - Drop the problematic admin policy that causes infinite recursion
    - Create a security definer function to check if user is admin
    - Recreate admin policies using the new function to avoid recursion
  
  2. Security
    - Function uses SECURITY DEFINER to bypass RLS when checking role
    - Only returns boolean, no sensitive data exposed
    - Admin policies now work without recursion
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can view all user codes" ON user_codes;
DROP POLICY IF EXISTS "Admins can update all user codes" ON user_codes;
DROP POLICY IF EXISTS "Admin can view all logs" ON connection_logs;

-- Create a function to check if current user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policies using the function
CREATE POLICY "Admins can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can view all user codes"
  ON user_codes
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update all user codes"
  ON user_codes
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin can view all logs"
  ON connection_logs
  FOR SELECT
  TO authenticated
  USING (is_admin());
