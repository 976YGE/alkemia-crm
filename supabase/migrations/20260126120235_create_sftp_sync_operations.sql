/*
  # Create SFTP Sync Operations Tracking

  1. New Tables
    - `sftp_sync_operations`
      - `id` (uuid, primary key) - Unique identifier for the sync operation
      - `sftp_config_id` (uuid, foreign key) - References the SFTP configuration used
      - `operation_type` (text) - Type of operation: 'import' or 'export'
      - `status` (text) - Status: 'pending', 'running', 'completed', 'failed'
      - `started_at` (timestamptz) - When the operation started
      - `completed_at` (timestamptz) - When the operation completed
      - `files_processed` (integer) - Number of files processed
      - `files_failed` (integer) - Number of files that failed
      - `error_message` (text) - Error message if failed
      - `details` (jsonb) - Additional details about the operation
      - `created_at` (timestamptz) - Record creation timestamp
      - `created_by` (uuid) - User who initiated the operation

  2. Security
    - Enable RLS on `sftp_sync_operations` table
    - Add policy for authenticated users to view sync operations
    - Add policy for authenticated users to create sync operations
*/

CREATE TABLE IF NOT EXISTS sftp_sync_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sftp_config_id uuid REFERENCES sftp_configurations(id) ON DELETE CASCADE,
  operation_type text NOT NULL CHECK (operation_type IN ('import', 'export')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  files_processed integer DEFAULT 0,
  files_failed integer DEFAULT 0,
  error_message text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE sftp_sync_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sync operations"
  ON sftp_sync_operations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create sync operations"
  ON sftp_sync_operations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update sync operations"
  ON sftp_sync_operations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sftp_sync_operations_config ON sftp_sync_operations(sftp_config_id);
CREATE INDEX IF NOT EXISTS idx_sftp_sync_operations_status ON sftp_sync_operations(status);
CREATE INDEX IF NOT EXISTS idx_sftp_sync_operations_created_at ON sftp_sync_operations(created_at DESC);
