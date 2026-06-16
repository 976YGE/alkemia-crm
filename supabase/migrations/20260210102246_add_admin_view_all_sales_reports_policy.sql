/*
  # Add admin policy to view all sales reports

  1. Changes
    - Add RLS policy to allow admins to view all sales_reports
    - Add RLS policy to allow admins to update all sales_reports
    
  2. Security
    - Only users with admin or super_admin role can access all reports
    - Regular users (animators) can only see their own reports
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sales_reports' 
    AND policyname = 'Admins can view all sales reports'
  ) THEN
    CREATE POLICY "Admins can view all sales reports"
      ON sales_reports
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
    WHERE tablename = 'sales_reports' 
    AND policyname = 'Admins can update all sales reports'
  ) THEN
    CREATE POLICY "Admins can update all sales reports"
      ON sales_reports
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
