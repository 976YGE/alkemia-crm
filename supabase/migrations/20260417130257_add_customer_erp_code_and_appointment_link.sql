/*
  # Enrich customers table and link to appointments

  1. Modified Tables
    - `customers`
      - Add `erp_code` (text, nullable) - ERP code identifying the point of sale
      - Add `old_crm_code` (text, nullable) - Legacy CRM code
      - Add `source` (text, default 'import') - Origin: 'import' or 'manual'
    - `appointments`
      - Add `customer_id` (uuid, nullable, FK to customers) - Direct link to customer

  2. Indexes
    - Unique index on `customers(erp_code, country_code)` WHERE erp_code IS NOT NULL
    - Index on `appointments(customer_id)` for join performance

  3. Important Notes
    - erp_code uniqueness is scoped per country_code
    - source field defaults to 'import' for SFTP-imported customers
    - customer_id on appointments is nullable (some appointments may not have a linked customer)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'erp_code'
  ) THEN
    ALTER TABLE customers ADD COLUMN erp_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'old_crm_code'
  ) THEN
    ALTER TABLE customers ADD COLUMN old_crm_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'source'
  ) THEN
    ALTER TABLE customers ADD COLUMN source text NOT NULL DEFAULT 'import';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN customer_id uuid REFERENCES customers(id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_erp_code_country
  ON customers(erp_code, country_code)
  WHERE erp_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_customer_id
  ON appointments(customer_id)
  WHERE customer_id IS NOT NULL;
