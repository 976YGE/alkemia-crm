-- Fix the INSERT policy on users to use private.is_admin() instead of public.is_admin()
DROP POLICY "Admins can insert users" ON public.users;
CREATE POLICY "Admins can insert users" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

-- Revoke EXECUTE on public.is_admin() from authenticated and anon
-- so it cannot be called via /rest/v1/rpc/is_admin
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;