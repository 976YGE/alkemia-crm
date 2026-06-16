/*
  # Create SFTP Connection Logs Table

  1. New Tables
    - `sftp_connection_logs`
      - `id` (uuid, primary key) - Unique identifier for the log entry
      - `sftp_config_id` (uuid, foreign key) - Reference to the SFTP configuration used
      - `connection_type` (text) - Type of connection: 'import' or 'export'
      - `status` (text) - Status: 'success' or 'failed'
      - `file_name` (text) - Name of the file being transferred
      - `records_count` (integer) - Number of records processed (nullable)
      - `file_size_bytes` (integer) - Size of the file in bytes (nullable)
      - `error_message` (text) - Error message if the connection failed (nullable)
      - `details` (jsonb) - Additional details about the operation (nullable)
      - `created_at` (timestamptz) - Timestamp of the operation

  2. Security
    - Enable RLS on `sftp_connection_logs` table
    - Add policy for super_admin to view all logs
    - Add policy for service_role to insert logs

  3. Indexes
    - Index on sftp_config_id for efficient lookups
    - Index on created_at for time-based queries
    - Index on status for filtering
*/

CREATE TABLE IF NOT EXISTS sftp_connection_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sftp_config_id uuid NOT NULL REFERENCES sftp_configurations(id) ON DELETE CASCADE,
  connection_type text NOT NULL CHECK (connection_type IN ('import', 'export')),
  status text NOT NULL CHECK (status IN ('success', 'failed')),
  file_name text,
  records_count integer,
  file_size_bytes integer,
  error_message text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sftp_connection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can view all SFTP connection logs"
  ON sftp_connection_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Service role can insert SFTP connection logs"
  ON sftp_connection_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sftp_connection_logs_config_id ON sftp_connection_logs(sftp_config_id);
CREATE INDEX IF NOT EXISTS idx_sftp_connection_logs_created_at ON sftp_connection_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sftp_connection_logs_status ON sftp_connection_logs(status);
CREATE INDEX IF NOT EXISTS idx_sftp_connection_logs_type ON sftp_connection_logs(connection_type);