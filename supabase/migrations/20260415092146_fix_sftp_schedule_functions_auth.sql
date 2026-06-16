/*
  # Fix SFTP Schedule Functions Authorization

  1. Changes
    - `check_and_trigger_sftp_schedules()` - Remove unused `service_key` variable,
      use `anon_key` directly in Authorization header since edge functions
      no longer perform manual token verification
    - `check_and_retry_failed_schedules()` - Same fix: remove unused `service_key`,
      use `anon_key` directly

  2. Important Notes
    - The `service_key` variable was declared but never assigned in both functions,
      causing `COALESCE(service_key, anon_key)` to always resolve to `anon_key`
    - Edge functions `scheduled-sftp-sync` and `sftp-schedule-alert` now handle
      their own authentication via service role key internally
    - pg_cron/pg_net only needs to pass a valid token to satisfy the HTTP layer
*/

CREATE OR REPLACE FUNCTION check_and_trigger_sftp_schedules()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  config_row RECORD;
  country_tz text;
  current_time_in_tz time;
  schedule_time time;
  time_diff interval;
  already_run boolean;
  base_url text;
  anon_key text;
BEGIN
  base_url := get_vault_secret('supabase_url');
  anon_key := get_vault_secret('supabase_anon_key');

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
          RAISE NOTICE 'Triggering scheduled sync for config % (country: %, time: %)',
            config_row.id, config_row.country_code, schedule_time;

          UPDATE sftp_configurations
          SET last_scheduled_run_at = now()
          WHERE id = config_row.id;

          PERFORM net.http_post(
            url := base_url || '/functions/v1/scheduled-sftp-sync',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || anon_key,
              'Apikey', anon_key
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
$$;

CREATE OR REPLACE FUNCTION check_and_retry_failed_schedules()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_op RECORD;
  base_url text;
  anon_key text;
  consecutive_failures integer;
  failed_op_ids uuid[];
BEGIN
  base_url := get_vault_secret('supabase_url');
  anon_key := get_vault_secret('supabase_anon_key');

  IF base_url IS NULL OR anon_key IS NULL THEN
    RAISE NOTICE 'supabase_url or supabase_anon_key not found in vault, skipping retry check';
    RETURN;
  END IF;

  FOR failed_op IN
    SELECT DISTINCT ON (sso.sftp_config_id, sso.operation_type)
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
          AND newer.operation_type = sso.operation_type
          AND newer.triggered_by IN ('schedule', 'retry')
          AND newer.status IN ('running', 'pending')
          AND newer.created_at > sso.created_at
      )
      AND NOT EXISTS (
        SELECT 1 FROM sftp_sync_operations retry
        WHERE retry.parent_operation_id = sso.id
          AND retry.status IN ('running', 'pending', 'completed')
      )
    ORDER BY sso.sftp_config_id, sso.operation_type, sso.completed_at DESC
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
        RAISE NOTICE 'Max retries reached for config %, sending alert', failed_op.sftp_config_id;

        PERFORM net.http_post(
          url := base_url || '/functions/v1/sftp-schedule-alert',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || anon_key,
            'Apikey', anon_key
          ),
          body := jsonb_build_object(
            'configId', failed_op.sftp_config_id::text,
            'operationIds', COALESCE(to_jsonb(failed_op_ids), '[]'::jsonb)
          )
        );
      END IF;
    ELSE
      RAISE NOTICE 'Retrying failed operation % (config: %, retry: %)',
        failed_op.id, failed_op.sftp_config_id, failed_op.retry_count + 1;

      PERFORM net.http_post(
        url := base_url || '/functions/v1/scheduled-sftp-sync',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || anon_key,
          'Apikey', anon_key
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
$$;