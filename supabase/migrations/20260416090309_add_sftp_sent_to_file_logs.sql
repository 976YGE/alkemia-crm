/*
  # Add SFTP delivery tracking to sftp_file_logs

  1. Modified Tables
    - `sftp_file_logs`
      - `sftp_sent` (boolean, default false) - Whether the file was successfully sent via SFTP
      - `sftp_sent_at` (timestamptz, nullable) - When the file was successfully sent via SFTP

  2. Important Notes
    - Existing export rows without SFTP tracking will default to false
    - This allows identifying files that were generated but not yet delivered via SFTP
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sftp_file_logs' AND column_name = 'sftp_sent'
  ) THEN
    ALTER TABLE sftp_file_logs ADD COLUMN sftp_sent boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sftp_file_logs' AND column_name = 'sftp_sent_at'
  ) THEN
    ALTER TABLE sftp_file_logs ADD COLUMN sftp_sent_at timestamptz;
  END IF;
END $$;

UPDATE sftp_file_logs
SET sftp_sent = true, sftp_sent_at = created_at
WHERE operation_type = 'export'
  AND file_type = 'sales_csv'
  AND status = 'success'
  AND sftp_sent = false
  AND filename IN (
    SELECT file_name FROM sftp_connection_logs
    WHERE connection_type = 'export' AND status = 'success'
  );
