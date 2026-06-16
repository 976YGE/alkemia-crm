/*
  # Create freelance animator management module

  1. Schema Changes
    - Add 'hr_manager' to the users.role CHECK constraint
    - Add 'is_freelance' boolean to user_codes table
    - Add 'notify_on_freelance_registration' boolean to admin_notification_settings

  2. New Tables
    - `freelance_registrations`
      - `id` (uuid, PK)
      - Personal info: first_name, last_name, email, phone, address, city, postal_code, country
      - Delivery: delivery_same_as_postal, delivery_address, delivery_city, delivery_postal_code, delivery_country
      - Company: siret, company_registration_date
      - Terms: remuneration (text), intervention_frequency, first_animation_date, last_animation_date
      - Workflow: status (pending/approved/rejected/finalized), validated_by, validated_at, rejection_reason, user_code, country_code, user_id
      - Anti-spam: submitted_at, ip_address, form_started_at
      - Timestamps: created_at, updated_at

    - `freelance_documents`
      - `id` (uuid, PK)
      - `registration_id` (FK)
      - `document_type` (rib, cv, id_card_front, id_card_back, kbis_or_rne)
      - `file_path`, `original_filename`, `uploaded_at`

    - `freelance_periodic_documents`
      - `id` (uuid, PK)
      - `registration_id` (FK, nullable)
      - `user_id` (FK, nullable)
      - `document_type` (urssaf_vigilance, fiscal_regularity)
      - `file_path`, `original_filename`
      - `uploaded_at`, `expires_at`
      - `reminder_sent_at`, `status` (valid, expiring_soon, expired)

  3. Security
    - RLS enabled on all new tables
    - Public INSERT on registrations/documents for form submission
    - HR managers and super_admins can SELECT/UPDATE all freelance data
    - Authenticated users can manage their own periodic documents

  4. Important Notes
    - The hr_manager role has access to agendas, clients, users across all countries
    - Anti-spam: rate limit enforced at edge function level (max 3 per IP per hour)
    - is_freelance flag on user_codes identifies non-salaried animators
*/

-- 1. Add hr_manager role to users table
DO $$
BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('animator', 'admin', 'super_admin', 'hr_manager'));
END $$;

-- 2. Add is_freelance to user_codes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_codes' AND column_name = 'is_freelance'
  ) THEN
    ALTER TABLE user_codes ADD COLUMN is_freelance boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- 3. Add notify_on_freelance_registration to admin_notification_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_notification_settings' AND column_name = 'notify_on_freelance_registration'
  ) THEN
    ALTER TABLE admin_notification_settings ADD COLUMN notify_on_freelance_registration boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- 4. Create freelance_registrations table
CREATE TABLE IF NOT EXISTS freelance_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Personal info
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  postal_code text NOT NULL,
  country text NOT NULL DEFAULT 'France',
  -- Delivery
  delivery_same_as_postal boolean NOT NULL DEFAULT true,
  delivery_address text,
  delivery_city text,
  delivery_postal_code text,
  delivery_country text,
  -- Company
  siret text NOT NULL,
  company_registration_date date NOT NULL,
  -- Terms
  remuneration text NOT NULL,
  intervention_frequency text NOT NULL,
  first_animation_date date NOT NULL,
  last_animation_date date,
  -- Workflow
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'finalized')),
  validated_by uuid REFERENCES users(id),
  validated_at timestamptz,
  rejection_reason text,
  user_code text,
  country_code text REFERENCES countries(code),
  user_id uuid REFERENCES users(id),
  -- Anti-spam
  submitted_at timestamptz DEFAULT now(),
  ip_address text,
  form_started_at timestamptz,
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE freelance_registrations ENABLE ROW LEVEL SECURITY;

-- 5. Create freelance_documents table
CREATE TABLE IF NOT EXISTS freelance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES freelance_registrations(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('rib', 'cv', 'id_card_front', 'id_card_back', 'kbis_or_rne')),
  file_path text NOT NULL,
  original_filename text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE freelance_documents ENABLE ROW LEVEL SECURITY;

-- 6. Create freelance_periodic_documents table
CREATE TABLE IF NOT EXISTS freelance_periodic_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid REFERENCES freelance_registrations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  document_type text NOT NULL CHECK (document_type IN ('urssaf_vigilance', 'fiscal_regularity')),
  file_path text NOT NULL,
  original_filename text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  reminder_sent_at timestamptz,
  status text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'expiring_soon', 'expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE freelance_periodic_documents ENABLE ROW LEVEL SECURITY;

-- 7. Create helper function to check HR manager or admin role
CREATE OR REPLACE FUNCTION is_hr_or_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid())
    AND role IN ('hr_manager', 'admin', 'super_admin')
  );
END;
$$;

-- 8. RLS Policies for freelance_registrations

-- Public can insert (for form submission)
CREATE POLICY "Anyone can submit a freelance registration"
  ON freelance_registrations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- HR managers and admins can view all registrations
CREATE POLICY "HR and admins can view all registrations"
  ON freelance_registrations
  FOR SELECT
  TO authenticated
  USING (is_hr_or_admin());

-- HR managers and admins can update registrations (approve/reject)
CREATE POLICY "HR and admins can update registrations"
  ON freelance_registrations
  FOR UPDATE
  TO authenticated
  USING (is_hr_or_admin())
  WITH CHECK (is_hr_or_admin());

-- Finalized users can view their own registration
CREATE POLICY "Users can view their own registration"
  ON freelance_registrations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 9. RLS Policies for freelance_documents

-- Public can insert documents (for form submission)
CREATE POLICY "Anyone can upload freelance documents"
  ON freelance_documents
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- HR managers and admins can view all documents
CREATE POLICY "HR and admins can view all freelance documents"
  ON freelance_documents
  FOR SELECT
  TO authenticated
  USING (is_hr_or_admin());

-- Finalized users can view their own documents
CREATE POLICY "Users can view their own freelance documents"
  ON freelance_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM freelance_registrations fr
      WHERE fr.id = registration_id
      AND fr.user_id = auth.uid()
    )
  );

-- 10. RLS Policies for freelance_periodic_documents

-- Public can insert (for initial form submission)
CREATE POLICY "Anyone can upload periodic documents"
  ON freelance_periodic_documents
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- HR managers and admins can view all periodic documents
CREATE POLICY "HR and admins can view all periodic documents"
  ON freelance_periodic_documents
  FOR SELECT
  TO authenticated
  USING (is_hr_or_admin());

-- Users can view their own periodic documents
CREATE POLICY "Users can view their own periodic documents"
  ON freelance_periodic_documents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own periodic documents (re-upload)
CREATE POLICY "Users can update their own periodic documents"
  ON freelance_periodic_documents
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can insert new periodic documents for themselves
CREATE POLICY "Authenticated users can insert their own periodic documents"
  ON freelance_periodic_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 11. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_freelance_registrations_status ON freelance_registrations(status);
CREATE INDEX IF NOT EXISTS idx_freelance_registrations_email ON freelance_registrations(email);
CREATE INDEX IF NOT EXISTS idx_freelance_registrations_ip_submitted ON freelance_registrations(ip_address, submitted_at);
CREATE INDEX IF NOT EXISTS idx_freelance_documents_registration ON freelance_documents(registration_id);
CREATE INDEX IF NOT EXISTS idx_freelance_periodic_documents_user ON freelance_periodic_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_freelance_periodic_documents_expires ON freelance_periodic_documents(expires_at, status);
CREATE INDEX IF NOT EXISTS idx_user_codes_is_freelance ON user_codes(is_freelance) WHERE is_freelance = true;
