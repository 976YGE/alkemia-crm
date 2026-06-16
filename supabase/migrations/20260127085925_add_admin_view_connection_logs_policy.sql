/*
  # Add admin policy to view connection logs

  1. Changes
    - Add new RLS policy allowing regular admins to view all connection logs
    - Existing super_admin policy remains unchanged
  
  2. Security
    - Users with role 'admin' can now view all connection logs
    - Super admins already had this access
*/

CREATE POLICY "Admin can view all logs"
  ON connection_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
