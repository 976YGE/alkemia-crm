/*
# Add is_no_sale flag to sales_reports

1. Modified Tables
   - `sales_reports`
     - Added `is_no_sale` (boolean, NOT NULL, default false)
       Indicates the animator declared no sales were made during the appointment.
       When true, the report has no product lines, total_amount is 0, and the
       comment field contains the mandatory justification.

2. Important Notes
   - Existing reports are unaffected (default false).
   - The CHECK constraint on total_amount is NOT changed; the form will set it to 0.
   - No security changes required; existing RLS policies already cover this column.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sales_reports'
      AND column_name = 'is_no_sale'
  ) THEN
    ALTER TABLE sales_reports ADD COLUMN is_no_sale boolean NOT NULL DEFAULT false;
  END IF;
END $$;
