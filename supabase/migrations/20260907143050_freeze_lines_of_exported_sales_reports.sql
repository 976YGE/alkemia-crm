/*
  # Freeze sales report lines once the report is exported

  1. Problems
    - The INSERT policy on sales_report_lines only checked ownership of the
      parent report, so an owner could append lines to an already exported
      report (the DELETE policy has the `NOT exported` guard, INSERT did not).
    - The UPDATE policy's WITH CHECK omitted the `NOT exported` guard present
      in its USING clause, so line rows of an exported report could still be
      rewritten.

  2. Changes
    - Recreate both policies with the `NOT exported` guard on the owner branch.
    - Admins keep full access, as before.
*/

DROP POLICY IF EXISTS "Sales report lines insertable by report owner" ON public.sales_report_lines;
DROP POLICY IF EXISTS "Sales report lines updatable by owner or admins" ON public.sales_report_lines;

CREATE POLICY "Sales report lines insertable by report owner"
  ON public.sales_report_lines
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sales_report_id IN (
      SELECT sr.id FROM public.sales_reports sr
      WHERE sr.user_id = (SELECT auth.uid())
        AND NOT sr.exported
    )
  );

CREATE POLICY "Sales report lines updatable by owner or admins"
  ON public.sales_report_lines
  FOR UPDATE
  TO authenticated
  USING (
    sales_report_id IN (
      SELECT sr.id FROM public.sales_reports sr
      WHERE sr.user_id = (SELECT auth.uid())
        AND NOT sr.exported
    )
    OR private.is_admin()
  )
  WITH CHECK (
    sales_report_id IN (
      SELECT sr.id FROM public.sales_reports sr
      WHERE sr.user_id = (SELECT auth.uid())
        AND NOT sr.exported
    )
    OR private.is_admin()
  );
