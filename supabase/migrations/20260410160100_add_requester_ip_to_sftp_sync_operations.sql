/*
  # Add requester_ip to sftp_sync_operations

  1. Changes
    - Add `requester_ip` (text, nullable) column to `sftp_sync_operations`
    - Stores the IP address of the user who triggered the SFTP operation
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sftp_sync_operations' AND column_name = 'requester_ip'
  ) THEN
    ALTER TABLE sftp_sync_operations ADD COLUMN requester_ip text;
  END IF;
END $$;
