/*
  # Restrict SFTP operational logs to admins

  1. Problem
    - sftp_sync_operations and sftp_file_logs both had `USING (true)` SELECT
      policies for every authenticated user, so any animator could read the
      full transfer history of every country: remote paths, file names and
      raw error strings.

  2. Changes
    - Both SELECT policies now require role admin or super_admin.
    - INSERT/UPDATE policies are untouched; edge functions use the service
      role and bypass RLS.
*/

DROP POLICY IF EXISTS "Authenticated users can view sync operations" ON public.sftp_sync_operations;
DROP POLICY IF EXISTS "Authenticated users can view file logs" ON public.sftp_file_logs;

CREATE POLICY "Sync operations viewable by admins"
  ON public.sftp_sync_operations
  FOR SELECT
  TO authenticated
  USING (private.is_admin());

CREATE POLICY "File logs viewable by admins"
  ON public.sftp_file_logs
  FOR SELECT
  TO authenticated
  USING (private.is_admin());
