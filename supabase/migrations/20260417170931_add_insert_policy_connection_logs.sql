/*
  # Add INSERT policy for connection_logs

  1. Changes
    - Add RLS INSERT policy allowing authenticated users to insert their own logs
    - This was missing and caused all connection logs to be silently dropped

  2. Security
    - Users can only insert logs where user_id matches their own auth.uid()
    - Read access remains restricted to admins only
*/

CREATE POLICY "Users can insert own connection logs"
  ON connection_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
