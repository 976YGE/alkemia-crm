/*
  # Update create_first_super_admin to confirm email

  ## Overview
  This migration updates the create_first_super_admin function to automatically
  confirm the email address of the first super admin, allowing immediate login.

  ## Changes
  1. Function Modified
    - `create_first_super_admin` now confirms the email in auth.users table
    - Uses UPDATE on auth.users to set email_confirmed_at and confirmed_at

  ## Security
  - Function still checks that no super_admin exists
  - Email confirmation only happens for the first admin
  - Function remains SECURITY DEFINER to access auth schema
*/

-- Drop existing function
DROP FUNCTION IF EXISTS create_first_super_admin(uuid, text, text, text, text);

-- Recreate function with email confirmation
CREATE OR REPLACE FUNCTION create_first_super_admin(
  p_auth_user_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_country_code text DEFAULT 'FR'
)
RETURNS json
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_code_id uuid;
  v_admin_count int;
  v_code text;
BEGIN
  -- Check if any super_admin already exists
  SELECT COUNT(*) INTO v_admin_count
  FROM users
  WHERE role = 'super_admin';

  IF v_admin_count > 0 THEN
    RAISE EXCEPTION 'A super admin already exists';
  END IF;

  -- Generate unique code
  v_code := 'ADMIN-' || extract(epoch from now())::bigint;

  -- Create user_code entry
  INSERT INTO user_codes (
    code,
    first_name,
    last_name,
    country_code,
    is_activated,
    activated_at
  )
  VALUES (
    v_code,
    p_first_name,
    p_last_name,
    p_country_code,
    true,
    now()
  )
  RETURNING id INTO v_user_code_id;

  -- Create user entry
  INSERT INTO users (
    id,
    user_code_id,
    email,
    country_code,
    preferred_language,
    role,
    metadata
  )
  VALUES (
    p_auth_user_id,
    v_user_code_id,
    p_email,
    p_country_code,
    'fr',
    'super_admin',
    '{}'::jsonb
  );

  -- Confirm email in auth.users table
  UPDATE auth.users
  SET 
    email_confirmed_at = now(),
    confirmed_at = now()
  WHERE id = p_auth_user_id;

  -- Return success with user info
  RETURN json_build_object(
    'success', true,
    'user_code_id', v_user_code_id,
    'code', v_code
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating super admin: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_first_super_admin(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_first_super_admin(uuid, text, text, text, text) TO anon;