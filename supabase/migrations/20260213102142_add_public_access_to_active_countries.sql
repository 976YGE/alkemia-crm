/*
  # Add Public Access to Active Countries

  ## Overview
  This migration allows public (unauthenticated) access to view countries that have
  an active SFTP configuration. This is necessary for the account activation page
  where users need to select their country before entering their user code.

  ## Changes
  1. Add RLS policy to allow public SELECT on countries with active SFTP config
  
  ## Security
  - Only SELECT access is granted
  - Only countries with active SFTP configurations are visible
  - No sensitive data is exposed (only country code and name)
*/

-- Allow public to view countries with active SFTP configurations
CREATE POLICY "Public can view countries with active SFTP"
  ON countries
  FOR SELECT
  TO public
  USING (
    active = true 
    AND EXISTS (
      SELECT 1 FROM sftp_configurations
      WHERE sftp_configurations.country_code = countries.code
      AND sftp_configurations.active = true
    )
  );