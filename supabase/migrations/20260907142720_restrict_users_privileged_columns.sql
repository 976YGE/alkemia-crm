/*
  # Restrict privileged columns on public.users

  1. Problem
    - `authenticated` held table-wide INSERT/UPDATE on public.users.
    - The row-level policies only constrain `id`, so any user could set
      role = 'super_admin' on their own row (privilege escalation), and any
      newly activated account could be created with an arbitrary role.

  2. Change
    - Revoke table-wide INSERT/UPDATE from anon/authenticated.
    - Re-grant UPDATE only on non-privileged, user-editable columns.
    - Re-grant INSERT only on the columns the activation flow writes.
    - `role` and `created_by` are therefore no longer client-writable;
      privileged accounts are created by the create-user edge function
      (service role) which is unaffected by these grants.

  3. Notes
    - SELECT and DELETE grants are untouched.
*/

REVOKE UPDATE ON public.users FROM authenticated;
REVOKE UPDATE ON public.users FROM anon;
REVOKE INSERT ON public.users FROM authenticated;
REVOKE INSERT ON public.users FROM anon;

GRANT UPDATE (email, preferred_language, metadata, updated_at) ON public.users TO authenticated;
GRANT INSERT (id, user_code_id, email, country_code, preferred_language, metadata) ON public.users TO authenticated;
