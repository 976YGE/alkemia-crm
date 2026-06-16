/*
  # Fix freelance RLS policies and secure public functions

  1. Security Changes
    - Replace overly permissive INSERT policies on `freelance_registrations`,
      `freelance_documents`, and `freelance_periodic_documents`
    - New policies restrict what data can be inserted (status must be pending,
      documents must reference existing registrations)
    - Move `is_hr_or_admin()` to `private` schema as SECURITY DEFINER
    - Revoke EXECUTE on `public.is_admin()` and `public.is_hr_or_admin()` from
      anon and authenticated roles

  2. Modified Tables
    - `freelance_registrations`: INSERT policy now requires status='pending'
    - `freelance_documents`: INSERT policy now requires valid registration_id
    - `freelance_periodic_documents`: Removed unrestricted anon INSERT policy;
      anon inserts now require a valid registration_id

  3. Functions
    - Created `private.is_hr_or_admin()` SECURITY DEFINER function
    - Updated all policies referencing `public.is_hr_or_admin()` to use private version
    - Revoked public EXECUTE on `public.is_admin()` and `public.is_hr_or_admin()`

  4. Important Notes
    - The freelance registration form is public (accessible without auth)
    - Anonymous inserts are still allowed but constrained to safe values
    - Authenticated periodic document uploads still verified via user_id = auth.uid()
*/

-- Step 1: Create private.is_hr_or_admin() function
CREATE OR REPLACE FUNCTION private.is_hr_or_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid())
    AND role IN ('hr_manager', 'admin', 'super_admin')
  );
END;
$$;

-- Step 2: Fix freelance_registrations INSERT policy
DROP POLICY IF EXISTS "Anyone can submit a freelance registration" ON public.freelance_registrations;

CREATE POLICY "Anon can submit freelance registration with pending status"
  ON public.freelance_registrations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND validated_by IS NULL
    AND validated_at IS NULL
  );

-- Step 3: Fix freelance_documents INSERT policy
DROP POLICY IF EXISTS "Anyone can upload freelance documents" ON public.freelance_documents;

CREATE POLICY "Anon can upload documents for existing registration"
  ON public.freelance_documents
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.freelance_registrations fr
      WHERE fr.id = registration_id
      AND fr.status = 'pending'
    )
  );

-- Step 4: Fix freelance_periodic_documents INSERT policy
DROP POLICY IF EXISTS "Anyone can upload periodic documents" ON public.freelance_periodic_documents;

CREATE POLICY "Anon can upload periodic documents for existing registration"
  ON public.freelance_periodic_documents
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    registration_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.freelance_registrations fr
      WHERE fr.id = registration_id
      AND fr.status = 'pending'
    )
  );

-- Step 5: Update policies that use public.is_hr_or_admin() to use private.is_hr_or_admin()
-- freelance_registrations SELECT
DROP POLICY IF EXISTS "HR and admins can view all registrations" ON public.freelance_registrations;
CREATE POLICY "HR and admins can view all registrations"
  ON public.freelance_registrations
  FOR SELECT
  TO authenticated
  USING (private.is_hr_or_admin());

-- freelance_registrations UPDATE
DROP POLICY IF EXISTS "HR and admins can update registrations" ON public.freelance_registrations;
CREATE POLICY "HR and admins can update registrations"
  ON public.freelance_registrations
  FOR UPDATE
  TO authenticated
  USING (private.is_hr_or_admin())
  WITH CHECK (private.is_hr_or_admin());

-- freelance_documents SELECT
DROP POLICY IF EXISTS "HR and admins can view all freelance documents" ON public.freelance_documents;
CREATE POLICY "HR and admins can view all freelance documents"
  ON public.freelance_documents
  FOR SELECT
  TO authenticated
  USING (private.is_hr_or_admin());

-- freelance_periodic_documents SELECT
DROP POLICY IF EXISTS "HR and admins can view all periodic documents" ON public.freelance_periodic_documents;
CREATE POLICY "HR and admins can view all periodic documents"
  ON public.freelance_periodic_documents
  FOR SELECT
  TO authenticated
  USING (private.is_hr_or_admin());

-- user_codes INSERT
DROP POLICY IF EXISTS "Admins and HR can insert user codes" ON public.user_codes;
CREATE POLICY "Admins and HR can insert user codes"
  ON public.user_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (private.is_hr_or_admin());

-- Step 6: Revoke EXECUTE on public functions from anon and authenticated
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_hr_or_admin() FROM anon, authenticated;
