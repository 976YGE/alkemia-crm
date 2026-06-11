/*
  # Create Daily Notification Cron Jobs

  1. New Functions
    - `trigger_day_before_notifications()` - Called every day at 18:00 UTC (20h Paris time).
      Uses pg_net to call the `trigger-daily-notifications` edge function with type "day_before"
      to remind animators of their animation the next day.
    - `trigger_end_of_day_notifications()` - Called every day at 17:00 UTC (19h Paris time).
      Uses pg_net to call the `trigger-daily-notifications` edge function with type "end_of_day"
      to remind animators to submit their sales report.

  2. Cron Jobs
    - `notify-day-before` - Runs daily at 18:00 UTC (20h Paris / summer, 19h winter)
    - `notify-end-of-day` - Runs daily at 17:00 UTC (19h Paris / summer, 18h winter)

  3. Important Notes
    - Uses pg_net for async HTTP calls to the edge function
    - Uses vault secrets (supabase_url, supabase_anon_key) already stored by previous migrations
    - The edge function handles timezone-aware appointment lookups internally
*/

CREATE OR REPLACE FUNCTION trigger_day_before_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_url text;
  anon_key text;
BEGIN
  base_url := get_vault_secret('supabase_url');
  anon_key := get_vault_secret('supabase_anon_key');

  IF base_url IS NULL OR anon_key IS NULL THEN
    RAISE NOTICE 'Vault secrets not found, skipping day_before notifications';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := base_url || '/functions/v1/trigger-daily-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'Apikey', anon_key
    ),
    body := jsonb_build_object('type', 'day_before')
  );

  RAISE NOTICE 'Triggered day_before notifications';
END;
$$;

CREATE OR REPLACE FUNCTION trigger_end_of_day_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_url text;
  anon_key text;
BEGIN
  base_url := get_vault_secret('supabase_url');
  anon_key := get_vault_secret('supabase_anon_key');

  IF base_url IS NULL OR anon_key IS NULL THEN
    RAISE NOTICE 'Vault secrets not found, skipping end_of_day notifications';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := base_url || '/functions/v1/trigger-daily-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'Apikey', anon_key
    ),
    body := jsonb_build_object('type', 'end_of_day')
  );

  RAISE NOTICE 'Triggered end_of_day notifications';
END;
$$;

SELECT cron.schedule(
  'notify-day-before',
  '0 18 * * *',
  $$SELECT trigger_day_before_notifications()$$
);

SELECT cron.schedule(
  'notify-end-of-day',
  '0 17 * * *',
  $$SELECT trigger_end_of_day_notifications()$$
);
