/*
  # Add admin policy to view all sales report lines

  1. Changes
    - Add RLS policy to allow admins to view all sales_report_lines
    - Add RLS policy to allow admins to update all sales_report_lines
    
  2. Security
    - Only users with admin or super_admin role can access all report lines
    - Regular users (animators) can only see their own report lines
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sales_report_lines' 
    AND policyname = 'Admins can view all sales report lines'
  ) THEN
    CREATE POLICY "Admins can view all sales report lines"
      ON sales_report_lines
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'super_admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sales_report_lines' 
    AND policyname = 'Admins can update all sales report lines'
  ) THEN
    CREATE POLICY "Admins can update all sales report lines"
      ON sales_report_lines
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'super_admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;
