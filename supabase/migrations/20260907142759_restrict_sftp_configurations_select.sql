/*
  # Restrict reads of sftp_configurations to admins

  1. Problem
    - The SELECT policy was granted to role `public` (so `anon`) with the
      predicate `(active = true) OR (admin)`. Any unauthenticated caller
      holding the publishable anon key could read host, port, username,
      remote paths and password_encrypted for every active configuration.

  2. Change
    - Drop that policy and replace it with an admin/super_admin policy
      scoped to `authenticated`.

  3. Notes
    - Edge functions use the service role, which bypasses RLS, so scheduled
      and manual syncs are unaffected.
*/

DROP POLICY IF EXISTS "SFTP configurations viewable by admins or public active check" ON public.sftp_configurations;

CREATE POLICY "SFTP configurations viewable by admins"
  ON public.sftp_configurations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = (SELECT auth.uid())
        AND u.role IN ('admin', 'super_admin')
    )
  );
