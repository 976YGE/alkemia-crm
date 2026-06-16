/*
  # Allow HR managers to view all appointments

  1. Changes
    - Update the SELECT policy on `appointments` to use `private.is_hr_or_admin()` 
      instead of `private.is_admin()`, so that hr_manager users can see all appointments.

  2. Security
    - HR managers gain read access to all appointments (same as admin/super_admin).
    - No changes to INSERT, UPDATE, or DELETE policies.

  3. Important notes
    1. The existing policy is dropped and recreated with the updated condition.
    2. No data is modified.
*/

DROP POLICY IF EXISTS "Appointments viewable by owner or admin" ON public.appointments;

CREATE POLICY "Appointments viewable by owner or admin"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    private.is_hr_or_admin()
    OR (
      user_code_id IN (
        SELECT users.user_code_id
        FROM users
        WHERE users.id = (SELECT auth.uid())
      )
    )
  );
