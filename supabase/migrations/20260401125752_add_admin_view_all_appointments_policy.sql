/*
  # Add admin access to all appointments

  ## Changes
  - Adds a SELECT policy on the `appointments` table allowing admin and super_admin users to view all appointments

  ## Security
  - Admins can read all appointments regardless of owner
  - Uses the same admin check pattern as other admin policies (via users table role column)
*/

CREATE POLICY "Admins can view all appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
      AND users.role IN ('admin', 'super_admin')
    )
  );
