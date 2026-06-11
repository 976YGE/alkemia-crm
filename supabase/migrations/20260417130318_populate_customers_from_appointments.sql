/*
  # Populate customers from existing appointments

  1. Data Migration
    - Insert customers from appointments that have an erp_code
    - Groups by erp_code + country_code to get unique points of sale
    - Takes the most recent appointment data for each customer (name, address, city, etc.)
    - Sets source = 'import' for all auto-populated customers

  2. Link Appointments
    - Updates appointments.customer_id to point to the newly created customers
    - Only links appointments that have a matching erp_code

  3. Important Notes
    - Appointments without erp_code are NOT linked (customer_id stays NULL)
    - Uses DISTINCT ON with ORDER BY updated_at DESC to pick the freshest data
*/

INSERT INTO customers (name, country_code, erp_code, old_crm_code, phone, address, city, postal_code, source, type)
SELECT DISTINCT ON (a.erp_code, a.country_code)
  a.store_name,
  a.country_code,
  a.erp_code,
  a.old_crm_code,
  a.phone,
  a.store_address,
  a.store_city,
  a.store_postal_code,
  'import',
  'client'
FROM appointments a
WHERE a.erp_code IS NOT NULL
  AND a.erp_code != ''
ORDER BY a.erp_code, a.country_code, a.updated_at DESC
ON CONFLICT (erp_code, country_code) WHERE erp_code IS NOT NULL
DO NOTHING;

UPDATE appointments a
SET customer_id = c.id
FROM customers c
WHERE a.erp_code IS NOT NULL
  AND a.erp_code != ''
  AND a.erp_code = c.erp_code
  AND a.country_code = c.country_code
  AND a.customer_id IS NULL;
