/*
  # Confirm existing admin emails (fixed)

  ## Overview
  This migration confirms email addresses for any existing super_admin accounts
  that were created before email confirmation was automated.

  ## Changes
  1. Updates auth.users table
    - Sets email_confirmed_at for super_admin users
    - confirmed_at is a generated column and will update automatically

  ## Security
  - Only confirms emails for users with super_admin role
  - Uses SECURITY DEFINER to access auth schema
*/

-- Create temporary function to confirm existing admin emails
CREATE OR REPLACE FUNCTION confirm_existing_admin_emails()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Confirm emails for existing super_admin users
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, now())
  WHERE id IN (
    SELECT id FROM users WHERE role = 'super_admin'
  )
  AND email_confirmed_at IS NULL;
END;
$$;

-- Execute the function
SELECT confirm_existing_admin_emails();

-- Drop the temporary function
DROP FUNCTION confirm_existing_admin_emails();