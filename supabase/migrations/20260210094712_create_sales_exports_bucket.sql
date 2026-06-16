/*
  # Create sales exports storage bucket

  1. Storage
    - Create `sales-exports` bucket for storing CSV export files
    - Only admins can upload export files
    - Admins can read all export files
  
  2. Security
    - Only users with role 'admin' or 'super_admin' can upload files
    - Only users with role 'admin' or 'super_admin' can read files
*/

-- Create storage bucket for sales exports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sales-exports',
  'sales-exports',
  false,
  52428800, -- 50MB limit
  ARRAY['text/csv', 'application/csv']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for sales-exports bucket

-- Policy: Admins can upload export files
DROP POLICY IF EXISTS "Admins can upload sales exports" ON storage.objects;
CREATE POLICY "Admins can upload sales exports"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sales-exports' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin')
  )
);

-- Policy: Admins can read all export files
DROP POLICY IF EXISTS "Admins can read sales exports" ON storage.objects;
CREATE POLICY "Admins can read sales exports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'sales-exports' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin')
  )
);

-- Policy: Admins can delete export files
DROP POLICY IF EXISTS "Admins can delete sales exports" ON storage.objects;
CREATE POLICY "Admins can delete sales exports"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'sales-exports' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'super_admin')
  )
);