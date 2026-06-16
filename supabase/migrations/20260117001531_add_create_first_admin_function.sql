/*
  # Add function to create first super admin

  ## Overview
  This migration adds a secure function that allows creating the first super admin account.
  The function bypasses RLS but includes safety checks to ensure only one super admin can be created this way.

  ## 1. Functions Created
  
  ### create_first_super_admin
  - Creates a user_code entry for the admin
  - Creates a user entry linked to the auth user
  - Only works if no super_admin exists yet
  - Executes with elevated privileges (SECURITY DEFINER)

  ## 2. Security
  - Function checks that no super_admin exists before allowing creation
  - Function is SECURITY DEFINER to bypass RLS temporarily
  - Function is only callable by authenticated users
  - After first admin is created, function will refuse to create another

  ## 3. Important Notes
  - This function is specifically for initial setup
  - After the first super admin exists, normal RLS policies apply
  - The function creates both user_code and user entries in a single transaction
*/

-- Create function to create first super admin
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