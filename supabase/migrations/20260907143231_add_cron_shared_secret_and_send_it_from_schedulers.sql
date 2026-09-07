/*
  # Add a shared secret for scheduler-invoked edge functions

  1. Problem
    - The scheduling SQL functions call edge functions with the publishable
      anon key, which anyone can read from the browser bundle. Functions such
      as scheduled-sftp-sync, sftp-schedule-alert, trigger-daily-notifications
      and check-periodic-documents therefore accepted requests from anyone.

  2. Change
    - Store a random `cron_shared_secret` in Vault (created once, kept if it
      already exists).
    - Every scheduler call now sends it in the `x-cron-secret` header.
    - The edge functions verify it (see their sources); they also accept the
      service role key or an admin session.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'cron_shared_secret') THEN
    PERFORM vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'cron_shared_secret',
      'Shared secret sent as x-cron-secret to scheduler-invoked edge functions'
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trigger_day_before_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
base_url text;
anon_key text;
cron_secret text;
BEGIN
base_url := get_vault_secret('supabase_url');
anon_key := get_vault_secret('supabase_anon_key');
cron_secret := get_vault_secret('cron_shared_secret');

IF base_url IS NULL OR anon_key IS NULL THEN
RAISE NOTICE 'Vault secrets not found, skipping day_before notifications';
RETURN;
END IF;

PERFORM net.http_post(
url := base_url || '/functions/v1/trigger-daily-notifications',
headers := jsonb_build_object(
'Content-Type', 'application/json',
'Authorization', 'Bearer ' || anon_key,
'Apikey', anon_key,
'x-cron-secret', COALESCE(cron_secret, '')
),
body := jsonb_build_object('type', 'day_before'),
timeout_milliseconds := 60000
);

RAISE NOTICE 'Triggered day_before notifications';
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_end_of_day_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
base_url text;
anon_key text;
cron_secret text;
BEGIN
base_url := get_vault_secret('supabase_url');
anon_key := get_vault_secret('supabase_anon_key');
cron_secret := get_vault_secret('cron_shared_secret');

IF base_url IS NULL OR anon_key IS NULL THEN
RAISE NOTICE 'Vault secrets not found, skipping end_of_day notifications';
RETURN;
END IF;

PERFORM net.http_post(
url := base_url || '/functions/v1/trigger-daily-notifications',
headers := jsonb_build_object(
'Content-Type', 'application/json',
'Authorization', 'Bearer ' || anon_key,
'Apikey', anon_key,
'x-cron-secret', COALESCE(cron_secret, '')
),
body := jsonb_build_object('type', 'end_of_day'),
timeout_milliseconds := 60000
);

RAISE NOTICE 'Triggered end_of_day notifications';
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_and_trigger_sftp_schedules()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
config_row RECORD;
country_tz text;
current_time_in_tz time;
schedule_time time;
time_diff interval;
already_run boolean;
base_url text;
anon_key text;
cron_secret text;
BEGIN
base_url := get_vault_secret('supabase_url');
anon_key := get_vault_secret('supabase_anon_key');
cron_secret := get_vault_secret('cron_shared_secret');

IF base_url IS NULL OR anon_key IS NULL THEN
RAISE NOTICE 'supabase_url or supabase_anon_key not found in vault, skipping schedule check';
RETURN;
END IF;

FOR config_row IN
SELECT sc.*, c.timezone
FROM sftp_configurations sc
JOIN countries c ON c.code = sc.country_code
WHERE sc.active = true
AND sc.schedule_enabled = true
AND sc.schedule_times IS NOT NULL
AND array_length(sc.schedule_times, 1) > 0
LOOP
country_tz := COALESCE(config_row.timezone, 'Europe/Paris');
current_time_in_tz := (now() AT TIME ZONE country_tz)::time;

FOREACH schedule_time IN ARRAY config_row.schedule_times
LOOP
time_diff := current_time_in_tz - schedule_time;

IF time_diff >= interval '0 minutes' AND time_diff < interval '5 minutes' THEN
already_run := false;
IF config_row.last_scheduled_run_at IS NOT NULL THEN
IF (config_row.last_scheduled_run_at AT TIME ZONE country_tz)::date = (now() AT TIME ZONE country_tz)::date
AND abs(EXTRACT(EPOCH FROM (
(config_row.last_scheduled_run_at AT TIME ZONE country_tz)::time - schedule_time
))) < 600
THEN
already_run := true;
END IF;
END IF;

IF NOT already_run THEN
UPDATE sftp_configurations
SET last_scheduled_run_at = now()
WHERE id = config_row.id;

PERFORM net.http_post(
url := base_url || '/functions/v1/scheduled-sftp-sync',
headers := jsonb_build_object(
'Content-Type', 'application/json',
'Authorization', 'Bearer ' || anon_key,
'Apikey', anon_key,
'x-cron-secret', COALESCE(cron_secret, '')
),
body := jsonb_build_object(
'configId', config_row.id::text,
'triggered_by', 'schedule',
'retry_count', 0
)
);
END IF;
END IF;
END LOOP;
END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_and_retry_failed_schedules()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
failed_op RECORD;
base_url text;
anon_key text;
cron_secret text;
failed_op_ids uuid[];
BEGIN
base_url := get_vault_secret('supabase_url');
anon_key := get_vault_secret('supabase_anon_key');
cron_secret := get_vault_secret('cron_shared_secret');

IF base_url IS NULL OR anon_key IS NULL THEN
RAISE NOTICE 'supabase_url or supabase_anon_key not found in vault, skipping retry check';
RETURN;
END IF;

FOR failed_op IN
SELECT DISTINCT ON (sso.sftp_config_id)
sso.*
FROM sftp_sync_operations sso
WHERE sso.triggered_by IN ('schedule', 'retry')
AND sso.status = 'failed'
AND sso.retry_count < 5
AND sso.completed_at IS NOT NULL
AND sso.completed_at > now() - interval '2 hours'
AND sso.completed_at < now() - interval '10 minutes'
AND NOT EXISTS (
SELECT 1 FROM sftp_sync_operations newer
WHERE newer.sftp_config_id = sso.sftp_config_id
AND newer.triggered_by IN ('schedule', 'retry')
AND newer.status IN ('running', 'pending')
AND newer.created_at > sso.created_at
)
AND NOT EXISTS (
SELECT 1 FROM sftp_sync_operations retry
WHERE retry.parent_operation_id = sso.id
AND retry.status IN ('running', 'pending', 'completed')
)
AND NOT EXISTS (
SELECT 1 FROM sftp_sync_operations success
WHERE success.sftp_config_id = sso.sftp_config_id
AND success.triggered_by IN ('schedule', 'retry')
AND success.status = 'completed'
AND success.completed_at > sso.completed_at
)
ORDER BY sso.sftp_config_id, sso.completed_at DESC
LOOP
IF failed_op.retry_count + 1 >= 5 THEN
SELECT array_agg(id) INTO failed_op_ids
FROM sftp_sync_operations
WHERE sftp_config_id = failed_op.sftp_config_id
AND triggered_by IN ('schedule', 'retry')
AND status = 'failed'
AND completed_at > now() - interval '24 hours'
LIMIT 10;

IF NOT EXISTS (
SELECT 1 FROM sftp_schedule_alerts
WHERE sftp_config_id = failed_op.sftp_config_id
AND created_at > now() - interval '6 hours'
) THEN
PERFORM net.http_post(
url := base_url || '/functions/v1/sftp-schedule-alert',
headers := jsonb_build_object(
'Content-Type', 'application/json',
'Authorization', 'Bearer ' || anon_key,
'Apikey', anon_key,
'x-cron-secret', COALESCE(cron_secret, '')
),
body := jsonb_build_object(
'configId', failed_op.sftp_config_id::text,
'operationIds', COALESCE(to_jsonb(failed_op_ids), '[]'::jsonb)
)
);
END IF;
ELSE
PERFORM net.http_post(
url := base_url || '/functions/v1/scheduled-sftp-sync',
headers := jsonb_build_object(
'Content-Type', 'application/json',
'Authorization', 'Bearer ' || anon_key,
'Apikey', anon_key,
'x-cron-secret', COALESCE(cron_secret, '')
),
body := jsonb_build_object(
'configId', failed_op.sftp_config_id::text,
'triggered_by', 'retry',
'parent_operation_id', failed_op.id::text,
'retry_count', failed_op.retry_count + 1
)
);
END IF;
END LOOP;
END;
$function$;
