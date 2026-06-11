/*
  # Revoke public execute on admin helper functions

  1. Security Changes
    - Revoke EXECUTE from PUBLIC, anon, and authenticated on public.is_admin()
    - Revoke EXECUTE from PUBLIC, anon, and authenticated on public.is_hr_or_admin()
    - Revoke EXECUTE from anon on private.is_hr_or_admin() (only authenticated should use it via policies)

  2. Important Notes
    - These functions are SECURITY DEFINER and should not be callable via REST API
    - Policies that reference them run in the policy evaluation context which bypasses these grants
    - The private schema functions are used by RLS policies internally
*/

-- Revoke all access on public.is_admin() 
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM authenticated;

-- Revoke all access on public.is_hr_or_admin()
REVOKE ALL ON FUNCTION public.is_hr_or_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_hr_or_admin() FROM anon;
REVOKE ALL ON FUNCTION public.is_hr_or_admin() FROM authenticated;

-- Revoke anon from private.is_hr_or_admin() (shouldn't be callable by anon)
REVOKE ALL ON FUNCTION private.is_hr_or_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_hr_or_admin() FROM anon;
