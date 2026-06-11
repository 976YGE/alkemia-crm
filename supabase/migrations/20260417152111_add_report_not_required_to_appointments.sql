/*
  # Add report_not_required flag to appointments

  1. Modified Tables
    - `appointments`
      - `report_not_required` (boolean, default false) - When true, the appointment does not require a sales report.
        Used to mark historical appointments imported before the platform was in use.

  2. Important Notes
    - This flag allows admins to bulk-mark old appointments so they don't appear in the "a saisir" list for animators.
    - No data is deleted or modified; only a new column is added.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'report_not_required'
  ) THEN
    ALTER TABLE appointments ADD COLUMN report_not_required boolean NOT NULL DEFAULT false;
  END IF;
END $$;
