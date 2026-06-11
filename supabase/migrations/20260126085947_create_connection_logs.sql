/*
  # Create connection logs table

  1. New Tables
    - `connection_logs`
      - `id` (uuid, primary key) - Unique identifier for the log entry
      - `user_id` (uuid, foreign key) - Reference to the user who performed the action
      - `action` (text) - Type of action: 'login', 'logout', 'failed_login'
      - `ip_address` (text) - IP address of the user
      - `user_agent` (text) - Browser/device information
      - `created_at` (timestamptz) - Timestamp of the action

  2. Security
    - Enable RLS on `connection_logs` table
    - Add policy for super_admin to read all logs
    - Regular users cannot access logs

  3. Indexes
    - Add index on user_id for faster queries
    - Add index on created_at for time-based queries
*/

-- Create connection_logs table
CREATE TABLE IF NOT EXISTS connection_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('login', 'logout', 'failed_login')),
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE connection_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for super_admin to read all logs
CREATE POLICY "Super admin can view all logs"
  ON connection_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_connection_logs_user_id ON connection_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_connection_logs_created_at ON connection_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_connection_logs_action ON connection_logs(action);
