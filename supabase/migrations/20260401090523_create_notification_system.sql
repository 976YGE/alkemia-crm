/*
  # Create Notification System

  ## Summary
  Creates tables and infrastructure for the 3-type notification system.

  ## New Tables

  ### user_notification_preferences
  One row per user storing which notification types they have enabled.
  - `notify_day_before` — reminder the day before an appointment
  - `notify_end_of_day` — reminder at end of day to fill in CR
  - `notify_cr_summary` — confirmation email once CR is completed

  ### admin_notification_settings
  One row per country for admin-side notification configuration.
  - `notify_on_cr_submit` — alert admins when a CR is submitted
  - `additional_recipients` — extra email addresses to include in CR notifications

  ### notification_logs
  Audit trail of all sent notifications for debugging and monitoring.

  ## Security
  - RLS enabled on all tables with appropriate policies
  - Users can only read/write their own preferences
  - Admin settings readable/writable only by admins
  - Notification logs readable only by admins
*/

-- user_notification_preferences
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_day_before boolean NOT NULL DEFAULT true,
  notify_end_of_day boolean NOT NULL DEFAULT true,
  notify_cr_summary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON public.user_notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own notification preferences"
  ON public.user_notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own notification preferences"
  ON public.user_notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can view all notification preferences"
  ON public.user_notification_preferences FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- admin_notification_settings
CREATE TABLE IF NOT EXISTS public.admin_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  notify_on_cr_submit boolean NOT NULL DEFAULT false,
  additional_recipients text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(country_code)
);

ALTER TABLE public.admin_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notification settings"
  ON public.admin_notification_settings FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert notification settings"
  ON public.admin_notification_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update notification settings"
  ON public.admin_notification_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- notification_logs
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('day_before', 'end_of_day', 'cr_summary')),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  sales_report_id uuid REFERENCES public.sales_reports(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notification logs"
  ON public.notification_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Service role can insert notification logs"
  ON public.notification_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_admin_notification_settings_updated_at
  BEFORE UPDATE ON public.admin_notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id
  ON public.notification_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_appointment_id
  ON public.notification_logs (appointment_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at
  ON public.notification_logs (created_at DESC);
