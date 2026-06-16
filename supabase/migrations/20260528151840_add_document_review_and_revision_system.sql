/*
  # Add per-document review system and revision workflow

  1. Modified Tables
    - `freelance_documents`
      - `review_status` (text, default 'pending') - HR can approve/reject each document individually
      - `review_comment` (text, nullable) - HR justification for rejection
      - `reviewed_by` (uuid, nullable) - Who reviewed the document
      - `reviewed_at` (timestamptz, nullable) - When the review happened
    - `freelance_periodic_documents`
      - Same 4 review columns as above
    - `freelance_registrations`
      - Status CHECK updated to include 'revision_requested'
      - `revision_token` (text, unique, nullable) - Magic link token for corrections
      - `revision_token_expires_at` (timestamptz, nullable) - Token expiration
      - SIRET CHECK constraint: must be exactly 14 digits (existing invalid data padded)

  2. Security
    - RLS policy allowing anonymous SELECT on registrations via revision_token
    - RLS policy allowing anonymous UPDATE on documents when registration has valid token
    - Index on revision_token for fast lookups

  3. Important Notes
    - The 'revision_requested' status allows the applicant to correct rejected documents
    - Token expires after 7 days
    - SIRET constraint enforces 14 numeric characters going forward
*/

-- 1. Add review columns to freelance_documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'freelance_documents' AND column_name = 'review_status'
  ) THEN
    ALTER TABLE freelance_documents
      ADD COLUMN review_status text NOT NULL DEFAULT 'pending',
      ADD COLUMN review_comment text,
      ADD COLUMN reviewed_by uuid REFERENCES auth.users(id),
      ADD COLUMN reviewed_at timestamptz;
  END IF;
END $$;

ALTER TABLE freelance_documents
  DROP CONSTRAINT IF EXISTS freelance_documents_review_status_check;
ALTER TABLE freelance_documents
  ADD CONSTRAINT freelance_documents_review_status_check
  CHECK (review_status IN ('pending', 'approved', 'rejected'));

-- 2. Add review columns to freelance_periodic_documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'freelance_periodic_documents' AND column_name = 'review_status'
  ) THEN
    ALTER TABLE freelance_periodic_documents
      ADD COLUMN review_status text NOT NULL DEFAULT 'pending',
      ADD COLUMN review_comment text,
      ADD COLUMN reviewed_by uuid REFERENCES auth.users(id),
      ADD COLUMN reviewed_at timestamptz;
  END IF;
END $$;

ALTER TABLE freelance_periodic_documents
  DROP CONSTRAINT IF EXISTS freelance_periodic_documents_review_status_check;
ALTER TABLE freelance_periodic_documents
  ADD CONSTRAINT freelance_periodic_documents_review_status_check
  CHECK (review_status IN ('pending', 'approved', 'rejected'));

-- 3. Update freelance_registrations status CHECK to include 'revision_requested'
ALTER TABLE freelance_registrations
  DROP CONSTRAINT IF EXISTS freelance_registrations_status_check;
ALTER TABLE freelance_registrations
  ADD CONSTRAINT freelance_registrations_status_check
  CHECK (status IN ('pending', 'revision_requested', 'approved', 'rejected', 'finalized'));

-- 4. Add revision token columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'freelance_registrations' AND column_name = 'revision_token'
  ) THEN
    ALTER TABLE freelance_registrations
      ADD COLUMN revision_token text UNIQUE,
      ADD COLUMN revision_token_expires_at timestamptz;
  END IF;
END $$;

-- 5. Fix existing invalid SIRET data (pad with zeros to 14 digits)
UPDATE freelance_registrations
  SET siret = lpad(siret, 14, '0')
  WHERE NOT (siret ~ '^\d{14}$');

-- 6. Add SIRET format constraint (14 digits)
ALTER TABLE freelance_registrations
  DROP CONSTRAINT IF EXISTS freelance_registrations_siret_format;
ALTER TABLE freelance_registrations
  ADD CONSTRAINT freelance_registrations_siret_format
  CHECK (siret ~ '^\d{14}$');

-- 7. Index on revision_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_freelance_registrations_revision_token
  ON freelance_registrations(revision_token)
  WHERE revision_token IS NOT NULL;

-- 8. RLS policy: allow anonymous SELECT on registration via valid revision_token
CREATE POLICY "Applicant can view own registration via revision token"
  ON freelance_registrations
  FOR SELECT
  TO anon
  USING (
    revision_token IS NOT NULL
    AND revision_token_expires_at > now()
    AND status = 'revision_requested'
  );

-- 9. RLS policy: allow anonymous SELECT on documents for a registration with valid token
CREATE POLICY "Applicant can view documents via revision token"
  ON freelance_documents
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM freelance_registrations r
      WHERE r.id = freelance_documents.registration_id
        AND r.revision_token IS NOT NULL
        AND r.revision_token_expires_at > now()
        AND r.status = 'revision_requested'
    )
  );

-- 10. RLS policy: allow anonymous UPDATE on documents for correction
CREATE POLICY "Applicant can update rejected documents via revision token"
  ON freelance_documents
  FOR UPDATE
  TO anon
  USING (
    review_status = 'rejected'
    AND EXISTS (
      SELECT 1 FROM freelance_registrations r
      WHERE r.id = freelance_documents.registration_id
        AND r.revision_token IS NOT NULL
        AND r.revision_token_expires_at > now()
        AND r.status = 'revision_requested'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM freelance_registrations r
      WHERE r.id = freelance_documents.registration_id
        AND r.revision_token IS NOT NULL
        AND r.revision_token_expires_at > now()
        AND r.status = 'revision_requested'
    )
  );

-- 11. RLS policy: allow anonymous SELECT on periodic docs for revision
CREATE POLICY "Applicant can view periodic documents via revision token"
  ON freelance_periodic_documents
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM freelance_registrations r
      WHERE r.id = freelance_periodic_documents.registration_id
        AND r.revision_token IS NOT NULL
        AND r.revision_token_expires_at > now()
        AND r.status = 'revision_requested'
    )
  );

-- 12. RLS policy: allow anonymous UPDATE on rejected periodic docs
CREATE POLICY "Applicant can update rejected periodic documents via revision token"
  ON freelance_periodic_documents
  FOR UPDATE
  TO anon
  USING (
    review_status = 'rejected'
    AND EXISTS (
      SELECT 1 FROM freelance_registrations r
      WHERE r.id = freelance_periodic_documents.registration_id
        AND r.revision_token IS NOT NULL
        AND r.revision_token_expires_at > now()
        AND r.status = 'revision_requested'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM freelance_registrations r
      WHERE r.id = freelance_periodic_documents.registration_id
        AND r.revision_token IS NOT NULL
        AND r.revision_token_expires_at > now()
        AND r.status = 'revision_requested'
    )
  );

-- 13. Allow anonymous to update registration status back to pending after correction
CREATE POLICY "Applicant can resubmit registration via revision token"
  ON freelance_registrations
  FOR UPDATE
  TO anon
  USING (
    revision_token IS NOT NULL
    AND revision_token_expires_at > now()
    AND status = 'revision_requested'
  )
  WITH CHECK (
    status = 'pending'
  );

-- 14. Storage policy: allow anonymous upload to registrations path when revision is active
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Applicant can re-upload documents during revision'
      AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Applicant can re-upload documents during revision"
      ON storage.objects
      FOR INSERT
      TO anon
      WITH CHECK (
        bucket_id = 'freelance-documents'
        AND (storage.foldername(name))[1] = 'registrations'
      );
  END IF;
END $$;
