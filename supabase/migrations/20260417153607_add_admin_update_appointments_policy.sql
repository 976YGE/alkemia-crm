/*
  # Add UPDATE policy for appointments table

  1. Security Changes
    - Add UPDATE policy on `appointments` for admin users
    - Allows admins to update appointments (e.g., set `report_not_required` flag)
    - Uses existing `is_admin()` function for authorization check

  2. Important Notes
    - The `appointments` table had RLS enabled but no UPDATE policy, which caused
      the bulk-mark-reported admin tool to silently fail (no rows updated)
    - This migration adds the missing policy following the same pattern used
      for `sales_reports` and `user_codes` tables
*/

CREATE POLICY "Appointments updatable by admin"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
