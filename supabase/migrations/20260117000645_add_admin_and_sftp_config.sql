/*
  # Add Admin Role and SFTP Configuration

  ## Overview
  This migration adds the ability for admins to manage SFTP server configurations 
  for data synchronization across different countries.

  ## 1. Tables Created
  
  ### sftp_configurations
  - `id` (uuid, primary key) - Unique identifier
  - `country_code` (text) - Country this configuration applies to
  - `host` (text) - SFTP server hostname or IP address
  - `port` (integer) - SFTP server port (default 22)
  - `username` (text) - SFTP username
  - `password_encrypted` (text) - Encrypted SFTP password
  - `import_path` (text) - Path on SFTP server for importing files
  - `export_path` (text) - Path on SFTP server for exporting files
  - `active` (boolean) - Whether this configuration is active
  - `last_sync_at` (timestamptz) - Last successful sync timestamp
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record last update timestamp

  ## 2. Security
  - Enable RLS on sftp_configurations table
  - Only super_admin users can read SFTP configurations
  - Only super_admin users can insert SFTP configurations
  - Only super_admin users can update SFTP configurations
  - Only super_admin users can delete SFTP configurations

  ## 3. Important Notes
  - Passwords are stored encrypted
  - Each country can have only one active SFTP configuration
  - Super admin access is required for all operations
*/

-- Create sftp_configurations table
CREATE TABLE IF NOT EXISTS sftp_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL REFERENCES countries(code),
  host text NOT NULL,
  port integer NOT NULL DEFAULT 22,
  username text NOT NULL,
  password_encrypted text NOT NULL,
  import_path text NOT NULL DEFAULT '/import',
  export_path text NOT NULL DEFAULT '/export',
  active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique index to ensure only one active config per country
CREATE UNIQUE INDEX IF NOT EXISTS idx_sftp_configurations_active_country 
  ON sftp_configurations(country_code) 
  WHERE active = true;

-- Enable RLS
ALTER TABLE sftp_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies for super_admin only
CREATE POLICY "Super admins can view SFTP configurations"
  ON sftp_configurations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can insert SFTP configurations"
  ON sftp_configurations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update SFTP configurations"
  ON sftp_configurations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete SFTP configurations"
  ON sftp_configurations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sftp_configurations_country ON sftp_configurations(country_code, active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_sftp_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'sftp_configurations_updated_at'
  ) THEN
    CREATE TRIGGER sftp_configurations_updated_at
      BEFORE UPDATE ON sftp_configurations
      FOR EACH ROW
      EXECUTE FUNCTION update_sftp_configurations_updated_at();
  END IF;
END $$;