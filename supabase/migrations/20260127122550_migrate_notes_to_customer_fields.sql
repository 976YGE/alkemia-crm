/*
  # Migrate customer information from notes to dedicated fields

  ## Changes
  
  This migration extracts customer information stored as JSON in the notes field
  and populates the dedicated fields (old_crm_code, erp_code, phone).
  
  ## Process
  
  1. Parse JSON data from notes field
  2. Extract old_crm_code, erp_code, and phone values
  3. Update appointments with extracted values
  4. Clear notes field if it only contained this JSON data
*/

DO $$
DECLARE
  rec RECORD;
  json_data jsonb;
BEGIN
  FOR rec IN 
    SELECT id, notes 
    FROM appointments 
    WHERE notes IS NOT NULL 
    AND notes LIKE '{%'
  LOOP
    BEGIN
      -- Try to parse the notes as JSON
      json_data := rec.notes::jsonb;
      
      -- Update the appointment with extracted values
      UPDATE appointments
      SET 
        old_crm_code = COALESCE(old_crm_code, json_data->>'old_crm_code'),
        erp_code = COALESCE(erp_code, json_data->>'erp_code'),
        phone = COALESCE(phone, json_data->>'phone'),
        -- Clear notes if it only contained the JSON customer data
        notes = CASE 
          WHEN jsonb_object_keys(json_data) <@ ARRAY['old_crm_code', 'erp_code', 'phone']
          THEN NULL 
          ELSE notes 
        END
      WHERE id = rec.id;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- If JSON parsing fails, skip this record
        CONTINUE;
    END;
  END LOOP;
END $$;