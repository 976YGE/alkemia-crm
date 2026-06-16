/*
  # Add hr_manager to admin-level access checks

  1. Changes
    - Update is_admin() function to include hr_manager role
    - This gives HR managers read access to all appointments, users, clients across countries

  2. Security
    - HR managers need visibility into all animators' agendas and client data
    - They do NOT get access to SFTP, product catalog admin, or other super_admin features
    - Those are controlled at application level, not RLS level
*/

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid())
    AND role IN ('admin', 'super_admin', 'hr_manager')
  );
END;
$$;
