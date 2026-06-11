/*
  # Add HR/admin UPDATE policies for document review

  1. Security Changes
    - Allow HR managers and admins to update `freelance_documents` (to set review_status, review_comment, etc.)
    - Allow HR managers and admins to update `freelance_periodic_documents` (same purpose)

  2. Important Notes
    - Without these policies, HR cannot approve/reject individual documents
    - Uses the existing `private.is_hr_or_admin()` function for authorization
*/

-- Allow HR/admins to update freelance_documents (for document review)
CREATE POLICY "HR and admins can update freelance documents"
  ON freelance_documents
  FOR UPDATE
  TO authenticated
  USING (private.is_hr_or_admin())
  WITH CHECK (private.is_hr_or_admin());

-- Allow HR/admins to update freelance_periodic_documents (for document review)
CREATE POLICY "HR and admins can update freelance periodic documents"
  ON freelance_periodic_documents
  FOR UPDATE
  TO authenticated
  USING (private.is_hr_or_admin())
  WITH CHECK (private.is_hr_or_admin());
