/*
  # Add INSERT policy for user_codes table

  1. Security Changes
    - Add INSERT policy on `user_codes` allowing admins and HR managers to create new user codes
    - This is required for the freelance registration approval flow where an admin assigns a user code

  2. Important Notes
    - Previously only SELECT and UPDATE policies existed on user_codes
    - The approval flow in FreelanceService.approveRegistration needs to insert a new user_code record
    - Uses the existing is_hr_or_admin() function for consistency with freelance_registrations policies
*/

CREATE POLICY "Admins and HR can insert user codes"
  ON user_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (is_hr_or_admin());
