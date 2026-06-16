/*
  # Add end time and appointment type to appointments

  1. Modified Tables
    - `appointments`
      - `appointment_end_time` (time) - calculated from start time + duration
      - `appointment_type` (text) - type of appointment: 'animation', 'formation', 'rdv_passage'

  2. Important Notes
    - appointment_type values: 'animation' (1), 'formation' (2), 'rdv_passage' (3)
    - Both columns are nullable for backward compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'appointment_end_time'
  ) THEN
    ALTER TABLE appointments ADD COLUMN appointment_end_time time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'appointment_type'
  ) THEN
    ALTER TABLE appointments ADD COLUMN appointment_type text;
  END IF;
END $$;
