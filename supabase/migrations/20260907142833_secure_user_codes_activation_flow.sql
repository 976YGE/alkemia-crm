/*
  # Secure the activation code table

  1. Problems
    - SELECT was granted to role `public` with a `(NOT is_activated)` branch,
      letting any unauthenticated caller download every unused activation code
      together with the first name, last name and country it belongs to.
    - UPDATE was granted to role `public` with `USING (is_admin() OR NOT
      is_activated)`, letting any unauthenticated caller flip is_activated
      (burning every pending code) or rewrite the names on those rows.

  2. Changes
    - SELECT: admins/HR, or the authenticated owner of the code.
    - UPDATE: admins/HR only, and only for authenticated callers.
    - New `public.lookup_activation_code(text, text)` SECURITY DEFINER function
      returns only the single row matching a code the caller already typed,
      with just the fields the activation screen displays.
    - New `public.activate_own_user_code(uuid)` SECURITY DEFINER function
      performs the activation flip, and only for the code linked to the
      calling user's own freshly created profile. The claim is atomic
      (single conditional UPDATE), so it cannot be replayed.

  3. Notes
    - Admin screens read user_codes as admin/HR and keep working.
    - getCurrentUser() joins the caller's own code, covered by the owner branch.
*/

DROP POLICY IF EXISTS "User codes viewable by owner, admin, or for activation" ON public.user_codes;
DROP POLICY IF EXISTS "User codes updatable by admin or for activation" ON public.user_codes;

CREATE POLICY "User codes viewable by owner or staff"
  ON public.user_codes
  FOR SELECT
  TO authenticated
  USING (
    private.is_hr_or_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_code_id = user_codes.id
        AND u.id = (SELECT auth.uid())
    )
  );

CREATE POLICY "User codes updatable by staff"
  ON public.user_codes
  FOR UPDATE
  TO authenticated
  USING (private.is_hr_or_admin())
  WITH CHECK (private.is_hr_or_admin());

CREATE OR REPLACE FUNCTION public.lookup_activation_code(
  p_code text,
  p_country_code text
)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  country_code text,
  is_active boolean,
  is_activated boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT uc.id, uc.first_name, uc.last_name, uc.country_code, uc.is_active, uc.is_activated
  FROM public.user_codes uc
  WHERE uc.code = p_code
    AND uc.country_code = p_country_code
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_activation_code(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_activation_code(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.activate_own_user_code(p_user_code_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.user_codes uc
  SET is_activated = true,
      activated_at = now(),
      updated_at = now()
  WHERE uc.id = p_user_code_id
    AND uc.is_activated = false
    AND uc.is_active = true
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.user_code_id = uc.id
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_own_user_code(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_own_user_code(uuid) TO authenticated;
