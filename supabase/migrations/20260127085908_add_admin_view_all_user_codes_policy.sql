/*
  # Add admin policy to view all user codes

  1. Changes
    - Add new RLS policy allowing admins and super_admins to view all user codes
    - Add new RLS policy allowing admins and super_admins to update user codes (for activation/deactivation)
    - Existing policies remain unchanged
  
  2. Security
    - Only users with role 'admin' or 'super_admin' can view and update all user codes
    - Regular users can still only view their own activated code
*/

CREATE POLICY "Admins can view all user codes"
  ON user_codes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update all user codes"
  ON user_codes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );
