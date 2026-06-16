/*
  # Add SFTP Scheduling Columns

  1. Modified Tables
    - `sftp_configurations`
      - `schedule_enabled` (boolean, default false) - Enable/disable automatic scheduling
      - `schedule_times` (time[], default {'08:00','18:00'}) - Configurable trigger times per country
      - `last_scheduled_run_at` (timestamptz) - Timestamp of last automatic execution
    - `sftp_sync_operations`
      - `triggered_by` (text, default 'manual') - Origin of the trigger: manual, schedule, or retry
      - `retry_count` (integer, default 0) - Number of retry attempts for this operation
      - `parent_operation_id` (uuid, nullable) - Reference to original operation for retries

  2. Important Notes
    - schedule_times allows each country/config to have its own sync schedule
    - triggered_by helps differentiate manual vs automatic vs retry operations
    - parent_operation_id creates a chain of retry attempts for traceability
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sftp_configurations' AND column_name = 'schedule_enabled'
  ) THEN
    ALTER TABLE sftp_configurations ADD COLUMN schedule_enabled boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sftp_configurations' AND column_name = 'schedule_times'
  ) THEN
    ALTER TABLE sftp_configurations ADD COLUMN schedule_times time[] NOT NULL DEFAULT '{08:00,18:00}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sftp_configurations' AND column_name = 'last_scheduled_run_at'
  ) THEN
    ALTER TABLE sftp_configurations ADD COLUMN last_scheduled_run_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sftp_sync_operations' AND column_name = 'triggered_by'
  ) THEN
    ALTER TABLE sftp_sync_operations ADD COLUMN triggered_by text NOT NULL DEFAULT 'manual';
    ALTER TABLE sftp_sync_operations ADD CONSTRAINT sftp_sync_operations_triggered_by_check
      CHECK (triggered_by IN ('manual', 'schedule', 'retry'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sftp_sync_operations' AND column_name = 'retry_count'
  ) THEN
    ALTER TABLE sftp_sync_operations ADD COLUMN retry_count integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sftp_sync_operations' AND column_name = 'parent_operation_id'
  ) THEN
    ALTER TABLE sftp_sync_operations ADD COLUMN parent_operation_id uuid REFERENCES sftp_sync_operations(id);
  END IF;
END $$;
