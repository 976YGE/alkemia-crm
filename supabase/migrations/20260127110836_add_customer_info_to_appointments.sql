/*
  # Add customer information to appointments

  ## Changes
  
  1. New Columns Added to `appointments` table
    - `old_crm_code` (text) - Code client from the old CRM system
    - `erp_code` (text) - ERP code for the customer
    - `phone` (text) - Customer phone number
  
  ## Purpose
  
  These fields store customer-specific information that will be displayed
  in appointment details to help animators have quick access to key
  customer information during their visits.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'old_crm_code'
  ) THEN
    ALTER TABLE appointments ADD COLUMN old_crm_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'erp_code'
  ) THEN
    ALTER TABLE appointments ADD COLUMN erp_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'phone'
  ) THEN
    ALTER TABLE appointments ADD COLUMN phone text;
  END IF;
END $$;