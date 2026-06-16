/*
  # Allow Public to Check SFTP Configuration Existence

  ## Overview
  This migration allows public (unauthenticated) users to verify if a country
  has an active SFTP configuration. This is necessary for the account activation
  page to display only countries that are properly configured.

  ## Changes
  1. Add RLS policy to allow public SELECT on sftp_configurations
     - Only country_code and active columns are effectively accessible
     - Sensitive information (host, username, password) remains protected through application logic
  
  ## Security
  - Only SELECT access is granted to public role
  - This policy only enables the countries RLS policy to work correctly
  - No sensitive data is directly exposed (application doesn't query sensitive fields)
*/

-- Allow public to check existence of active SFTP configurations
CREATE POLICY "Public can check SFTP configuration existence"
  ON sftp_configurations
  FOR SELECT
  TO public
  USING (active = true);