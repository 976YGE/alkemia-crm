/*
  # Add function to reset admin account

  ## Overview
  This migration adds a function to completely remove a super admin account
  and allow creating a new one.

  ## Changes
  1. New Function
    - `reset_super_admin` removes super_admin user and related data
    - Deletes from users table and auth.users table
    - Deletes related user_code

  ## Security
  - Function is SECURITY DEFINER to access auth schema
  - Available to anon users to allow resetting before login
*/

CREATE OR REPLACE FUNCTION reset_super_admin(p_email text)
RETURNS json
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_user_code_id uuid;
BEGIN
  -- Find the super_admin user
  SELECT id, user_code_id INTO v_user_id, v_user_code_id
  FROM users
  WHERE email = p_email AND role = 'super_admin';

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Admin not found');
  END IF;

  -- Delete from users table
  DELETE FROM users WHERE id = v_user_id;

  -- Delete from user_codes table
  DELETE FROM user_codes WHERE id = v_user_code_id;

  -- Delete from auth.users table
  DELETE FROM auth.users WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'message', 'Admin account deleted successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION reset_super_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_super_admin(text) TO anon;