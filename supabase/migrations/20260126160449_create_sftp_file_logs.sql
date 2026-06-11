/*
  # Create SFTP File Logs Table

  1. New Tables
    - `sftp_file_logs`
      - `id` (uuid, primary key)
      - `filename` (text) - Name of the file processed
      - `operation_type` (text) - Type of operation: 'import' or 'export'
      - `file_type` (text) - Type of file: 'products', 'appointments', 'sales', etc.
      - `status` (text) - Status: 'success', 'failed', 'partial'
      - `records_processed` (integer) - Number of records processed
      - `records_failed` (integer) - Number of records failed
      - `error_message` (text) - Error message if any
      - `processing_time_ms` (integer) - Processing time in milliseconds
      - `file_size_bytes` (integer) - Size of the file in bytes
      - `created_at` (timestamptz) - When the processing occurred
      - `created_by` (uuid) - User who triggered the operation (nullable for automatic operations)

  2. Security
    - Enable RLS on `sftp_file_logs` table
    - Add policy for authenticated users to read all logs
    - Add policy for system to insert logs

  3. Indexes
    - Index on created_at for efficient date-based queries
    - Index on operation_type and file_type for filtering
    - Index on status for monitoring
*/

CREATE TABLE IF NOT EXISTS sftp_file_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  operation_type text NOT NULL CHECK (operation_type IN ('import', 'export')),
  file_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  records_processed integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  error_message text,
  processing_time_ms integer,
  file_size_bytes integer,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE sftp_file_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view file logs"
  ON sftp_file_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert file logs"
  ON sftp_file_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sftp_file_logs_created_at ON sftp_file_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sftp_file_logs_operation_type ON sftp_file_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_sftp_file_logs_file_type ON sftp_file_logs(file_type);
CREATE INDEX IF NOT EXISTS idx_sftp_file_logs_status ON sftp_file_logs(status);