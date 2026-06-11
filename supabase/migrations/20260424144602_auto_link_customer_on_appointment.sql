/*
  # Auto-link customers from appointments

  1. New Function
    - `auto_link_customer_from_appointment()` - trigger function that runs BEFORE INSERT
      or UPDATE on appointments. If the appointment has an erp_code and no customer_id,
      it ensures a matching customer exists (creating it from the appointment's store
      data when missing) and sets appointments.customer_id to that customer's id.

  2. New Trigger
    - `appointments_auto_link_customer` fires BEFORE INSERT OR UPDATE OF erp_code,
      country_code, customer_id on appointments. This keeps the link fresh when new
      rows arrive (e.g. via SFTP import) or when erp_code/country change.

  3. Important Notes
    - Appointments without erp_code remain unlinked (customer_id stays NULL).
    - The function uses SECURITY DEFINER so the SFTP import context (which may run
      under a non-privileged role) can still create the customer row.
    - Existing RLS policies are unaffected; the trigger only runs server-side.
*/

CREATE OR REPLACE FUNCTION auto_link_customer_from_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_customer_id uuid;
BEGIN
  IF NEW.erp_code IS NULL OR NEW.erp_code = '' OR NEW.country_code IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.customer_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO existing_customer_id
  FROM customers
  WHERE erp_code = NEW.erp_code
    AND country_code = NEW.country_code
  LIMIT 1;

  IF existing_customer_id IS NULL THEN
    INSERT INTO customers (
      name, country_code, erp_code, old_crm_code,
      phone, address, city, postal_code, source, type
    )
    VALUES (
      COALESCE(NEW.store_name, NEW.erp_code),
      NEW.country_code,
      NEW.erp_code,
      NEW.old_crm_code,
      NEW.phone,
      NEW.store_address,
      NEW.store_city,
      NEW.store_postal_code,
      'import',
      'client'
    )
    ON CONFLICT (erp_code, country_code) WHERE erp_code IS NOT NULL
    DO UPDATE SET updated_at = now()
    RETURNING id INTO existing_customer_id;
  END IF;

  NEW.customer_id := existing_customer_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointments_auto_link_customer ON appointments;

CREATE TRIGGER appointments_auto_link_customer
  BEFORE INSERT OR UPDATE OF erp_code, country_code, customer_id
  ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_customer_from_appointment();
