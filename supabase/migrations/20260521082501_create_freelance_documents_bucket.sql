/*
  # Create storage bucket for freelance documents

  1. Storage
    - Create 'freelance-documents' bucket (10MB file limit)
    - Allow public uploads for registration form submissions
    - Allow HR managers and admins to download all files
    - Allow authenticated users to access their own files

  2. Important Notes
    - Files stored under: registrations/{registration_id}/{document_type}/{filename}
    - Or for periodic updates: users/{user_id}/periodic/{document_type}/{filename}
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'freelance-documents',
  'freelance-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload to registrations/ path (for public form)
CREATE POLICY "Anyone can upload freelance registration documents"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'freelance-documents' AND (storage.foldername(name))[1] = 'registrations');

-- Allow HR managers and admins to read all freelance documents
CREATE POLICY "HR and admins can read all freelance documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'freelance-documents' AND is_hr_or_admin());

-- Allow authenticated users to upload to their own periodic folder
CREATE POLICY "Users can upload their own periodic documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'freelance-documents'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read their own freelance documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'freelance-documents'
    AND (storage.foldername(name))[1] = 'users'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
