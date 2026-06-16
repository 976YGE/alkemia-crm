/*
  # Fix user_codes RLS access for anonymous users

  1. Problem
    - The SELECT policy on `user_codes` calls `private.is_admin()` which the `anon` role
      cannot execute, causing a 401 when unauthenticated users try to verify their code
      during account activation.

  2. Fix
    - Grant EXECUTE on `private.is_admin()` to `anon`.
    - The function is SECURITY DEFINER and safely returns FALSE when `auth.uid()` is NULL,
      so there is no security risk.

  3. Important notes
    - This does NOT grant anonymous users admin access; it merely lets the policy evaluate
      without a permissions error so the remaining conditions (`NOT is_activated`) can be checked.
*/

GRANT EXECUTE ON FUNCTION private.is_admin() TO anon;
