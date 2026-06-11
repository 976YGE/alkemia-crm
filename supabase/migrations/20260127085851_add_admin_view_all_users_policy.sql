/*
  # Add admin policy to view all users

  1. Changes
    - Add new RLS policy allowing admins and super_admins to view all users
    - Existing policy for regular users to view their own profile remains unchanged
  
  2. Security
    - Only users with role 'admin' or 'super_admin' can view all user records
    - Regular users can still only view their own profile
*/

CREATE POLICY "Admins can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );
