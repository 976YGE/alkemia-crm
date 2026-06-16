/*
  # Fix User Codes RLS Policy

  1. Changes
    - Add policy to allow authenticated users to view their own activated user_code
    - This fixes the issue where users cannot access their profile after activation
  
  2. Security
    - Users can only see their own user_code (via users table join)
    - Maintains security while allowing proper data access
*/

-- Add policy for users to view their own activated user_code
CREATE POLICY "Users can view own activated user code"
  ON user_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.user_code_id = user_codes.id
      AND users.id = auth.uid()
    )
  );
