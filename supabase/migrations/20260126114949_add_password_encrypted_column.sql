/*
  # Add password_encrypted column to sftp_configurations

  1. Changes
    - Add missing password_encrypted column to sftp_configurations table
    - This column is required to store encrypted SFTP passwords
  
  2. Security
    - Column is NOT NULL to ensure passwords are always provided
*/

-- Add password_encrypted column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sftp_configurations' AND column_name = 'password_encrypted'
  ) THEN
    ALTER TABLE sftp_configurations ADD COLUMN password_encrypted text NOT NULL DEFAULT '';
  END IF;
END $$;
