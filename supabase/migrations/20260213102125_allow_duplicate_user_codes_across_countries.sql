/*
  # Allow Duplicate User Codes Across Countries

  ## Overview
  This migration modifies the user_codes table to allow the same user code
  to exist in different countries. This is necessary because user codes are
  unique only within a country, not globally.

  ## Changes
  1. Remove the existing UNIQUE constraint on the `code` column
  2. Add a new composite UNIQUE constraint on `(code, country_code)`
  
  ## Security
  - No changes to RLS policies
  - Data integrity maintained through composite unique constraint
*/

-- Drop the existing unique constraint on code
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_codes_code_key'
  ) THEN
    ALTER TABLE user_codes DROP CONSTRAINT user_codes_code_key;
  END IF;
END $$;

-- Add composite unique constraint on (code, country_code)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_codes_code_country_key'
  ) THEN
    ALTER TABLE user_codes ADD CONSTRAINT user_codes_code_country_key UNIQUE (code, country_code);
  END IF;
END $$;