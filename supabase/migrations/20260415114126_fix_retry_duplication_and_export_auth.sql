/*
  # Fix retry duplication in SFTP schedule functions

  1. Changes
    - `check_and_retry_failed_schedules()` - Change `DISTINCT ON (sftp_config_id, operation_type)`
      to `DISTINCT ON (sftp_config_id)` to prevent duplicate retries.
      
      Previously, the retry function selected one failed import AND one failed export per config,
      each triggering a call to `scheduled-sftp-sync` which always runs BOTH import+export.
      This caused an exponential duplication: 2 retries per cycle instead of 1, each creating
      2 new operations (import+export), leading to 4 failed operations per cycle that would
      each spawn their own retries.

  2. Root Cause
    - `scheduled-sftp-sync` always runs import AND export in sequence
    - The retry logic treated import and export failures independently
    - Each retry call created 2 new operations (import+export), doubling the failure count

  3. Important Notes
    - Only one retry call per sftp_config_id per cycle is now triggered
    - The retry still calls `scheduled-sftp-sync` which handles both import and export
    - Also adds `NOT EXISTS` check to prevent retrying if a newer successful operation exists
*/

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
