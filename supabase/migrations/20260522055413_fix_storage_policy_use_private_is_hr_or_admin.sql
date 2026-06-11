/*
  # Fix storage policy to use private.is_hr_or_admin()

  1. Modified Policies
    - Storage `objects` table: Updated "HR and admins can read all freelance documents"
      policy to use `private.is_hr_or_admin()` instead of the now-revoked public version

  2. Important Notes
    - The public.is_hr_or_admin() function had EXECUTE revoked in previous migration
    - Storage policies need to reference the private schema version
*/

DROP POLICY IF EXISTS "HR and admins can read all freelance documents" ON storage.objects;

CREATE POLICY "HR and admins can read all freelance documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'freelance-documents'
    AND private.is_hr_or_admin()
  );
