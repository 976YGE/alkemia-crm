/*
  # Add function to get auth users info

  1. New Functions
    - `get_auth_users_info` - Retrieves last_sign_in_at from auth.users table
      - Takes array of user IDs as input
      - Returns user_id and last_sign_in_at for each user
      - Only accessible to authenticated admins
  
  2. Security
    - Function runs with SECURITY DEFINER to access auth schema
    - Only admin and super_admin roles can execute it
*/

CREATE OR REPLACE FUNCTION get_auth_users_info(user_ids uuid[])
RETURNS TABLE (
  id uuid,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    au.id,
    au.last_sign_in_at
  FROM auth.users au
  WHERE au.id = ANY(user_ids);
END;
$$;
