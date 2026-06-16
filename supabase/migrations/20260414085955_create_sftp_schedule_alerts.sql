/*
  # Create SFTP Schedule Alerts Table

  1. New Tables
    - `sftp_schedule_alerts`
      - `id` (uuid, primary key)
      - `sftp_config_id` (uuid, FK to sftp_configurations)
      - `alert_type` (text) - Type of alert: max_retries_reached or schedule_failure
      - `operation_ids` (uuid[]) - IDs of the failed operations linked to this alert
      - `recipients` (text[]) - Email addresses of alert recipients
      - `sent_at` (timestamptz) - When the alert was sent
      - `details` (jsonb) - Alert content and context information
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on sftp_schedule_alerts
    - Super admins can read alerts
    - Service role can insert alerts (from edge functions)

  3. Indexes
    - Index on sftp_config_id for lookups by configuration
    - Index on created_at for chronological queries
*/

CREATE TABLE IF NOT EXISTS sftp_schedule_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sftp_config_id uuid NOT NULL REFERENCES sftp_configurations(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('max_retries_reached', 'schedule_failure')),
  operation_ids uuid[] NOT NULL DEFAULT '{}',
  recipients text[] NOT NULL DEFAULT '{}',
  sent_at timestamptz,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sftp_schedule_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view schedule alerts"
  ON sftp_schedule_alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_sftp_schedule_alerts_config_id
  ON sftp_schedule_alerts(sftp_config_id);

CREATE INDEX IF NOT EXISTS idx_sftp_schedule_alerts_created_at
  ON sftp_schedule_alerts(created_at DESC);
