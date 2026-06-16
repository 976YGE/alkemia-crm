/*
  # Add proof file support to sales reports

  1. Changes to sales_reports table
    - Add `proof_file_path` column to store the file path in storage
    - Allow NULL for existing records, but will be required for new reports
  
  2. Storage
    - Create `sales-proofs` bucket for storing proof files (PDFs and images)
    - Configure storage policies for file access control
  
  3. Security
    - Users can only upload files for their own reports
    - Users can only access their own proof files
    - Admins can access all proof files
*/

-- Add proof_file_path column to sales_reports (allow NULL for existing records)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales_reports' AND column_name = 'proof_file_path'
  ) THEN
    ALTER TABLE sales_reports ADD COLUMN proof_file_path text;
  END IF;
END $$;

-- Create storage bucket for sales proofs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sales-proofs',
  'sales-proofs',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for sales-proofs bucket

-- Policy: Users can upload proof files for their own reports
DROP POLICY IF EXISTS "Users can upload own sales proof files" ON storage.objects;
CREATE POLICY "Users can upload own sales proof files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sales-proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can read their own proof files
DROP POLICY IF EXISTS "Users can read own sales proof files" ON storage.objects;
CREATE POLICY "Users can read own sales proof files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'sales-proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Admins can read all proof files
DROP POLICY IF EXISTS "Admins can read all sales proof files" ON storage.objects;
CREATE POLICY "Admins can read all sales proof files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'sales-proofs' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin')
  )
);

-- Policy: Users can update their own proof files
DROP POLICY IF EXISTS "Users can update own sales proof files" ON storage.objects;
CREATE POLICY "Users can update own sales proof files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'sales-proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'sales-proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own proof files
DROP POLICY IF EXISTS "Users can delete own sales proof files" ON storage.objects;
CREATE POLICY "Users can delete own sales proof files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'sales-proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);