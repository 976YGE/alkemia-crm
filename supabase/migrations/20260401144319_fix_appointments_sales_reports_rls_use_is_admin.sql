/*
  # Fix RLS policies on appointments and sales_reports to use is_admin()

  ## Problem
  The RLS policies on appointments and sales_reports directly query the users
  table with EXISTS subqueries. This causes issues because the users table itself
  has RLS policies that call is_admin(), which queries users again — circular
  dependency leading to "Bad request" errors for admin users.

  ## Fix
  Replace all inline admin checks with calls to is_admin() (SECURITY DEFINER)
  which bypasses RLS when checking admin status.
*/

DROP POLICY IF EXISTS "Admins can view all appointments" ON appointments;
CREATE POLICY "Admins can view all appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Sales reports viewable by owner or admins" ON sales_reports;
CREATE POLICY "Sales reports viewable by owner or admins"
  ON sales_reports FOR SELECT
  TO authenticated
  USING ((user_id = (SELECT auth.uid())) OR is_admin());

DROP POLICY IF EXISTS "Sales reports updatable by owner or admins" ON sales_reports;
CREATE POLICY "Sales reports updatable by owner or admins"
  ON sales_reports FOR UPDATE
  TO authenticated
  USING (((user_id = (SELECT auth.uid())) AND (NOT exported)) OR is_admin())
  WITH CHECK (((user_id = (SELECT auth.uid())) AND (NOT exported)) OR is_admin());
