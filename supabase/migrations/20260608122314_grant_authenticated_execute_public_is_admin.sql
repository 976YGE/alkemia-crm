-- Grant authenticated role permission to execute public.is_admin()
-- Required because RLS INSERT policies on public.users reference this function
-- and PostgreSQL evaluates all policies even if one would already pass.
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;