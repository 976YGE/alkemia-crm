/*
  # Cancel overlapping duplicate appointments

  1. Problem
    - When the CRM deletes and recreates an appointment with a new external_id,
      the old appointment remains in the database as 'scheduled'
    - This creates duplicates for the same animator on the same date with overlapping times

  2. Solution
    - Identify pairs of 'scheduled' appointments for the same animator (user_code_id),
      same date, same country, where time ranges overlap
    - Cancel the older one (lower created_at) unless it has a linked sales_report
    - Overlap condition: start_A < end_B AND start_B < end_A

  3. Safety
    - Never cancels appointments with linked sales_reports
    - Only affects appointments with status = 'scheduled'
    - Uses COALESCE for null end times (defaults to start_time + 1 hour)
*/

UPDATE appointments
SET status = 'cancelled', updated_at = now()
WHERE id IN (
  SELECT a1.id
  FROM appointments a1
  JOIN appointments a2
    ON a1.user_code_id = a2.user_code_id
    AND a1.appointment_date = a2.appointment_date
    AND a1.country_code = a2.country_code
    AND a1.id != a2.id
    AND a1.status = 'scheduled'
    AND a2.status = 'scheduled'
    AND a1.created_at < a2.created_at
    -- Overlap: start_A < end_B AND start_B < end_A
    AND a1.appointment_time < COALESCE(a2.appointment_end_time, a2.appointment_time + interval '1 hour')
    AND a2.appointment_time < COALESCE(a1.appointment_end_time, a1.appointment_time + interval '1 hour')
  WHERE NOT EXISTS (
    SELECT 1 FROM sales_reports sr WHERE sr.appointment_id = a1.id
  )
);
