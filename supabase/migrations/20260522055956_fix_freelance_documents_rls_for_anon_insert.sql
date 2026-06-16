/*
  # Fix freelance documents INSERT policies for anonymous users

  1. Problem
    - The INSERT policies on freelance_documents and freelance_periodic_documents
      use a sub-SELECT on freelance_registrations to verify the registration exists
    - But anonymous users have no SELECT policy on freelance_registrations
    - This causes the sub-query to always return false, blocking document uploads

  2. Solution
    - Create a SECURITY DEFINER function that checks if a registration exists
      and is in pending status, bypassing RLS
    - Update the INSERT policies to use this function instead of direct sub-queries

  3. Security
    - The function only returns a boolean (exists or not)
    - It only checks registrations with status = 'pending'
    - It cannot be used to read registration data
*/

-- Create helper function to check registration existence (bypasses RLS)
CREATE OR REPLACE FUNCTION private.registration_exists_and_pending(reg_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.freelance_registrations
    WHERE id = reg_id AND status = 'pending'
  );
END;
$$;

-- Grant execute to anon and authenticated (needed for policy evaluation)
GRANT EXECUTE ON FUNCTION private.registration_exists_and_pending(uuid) TO anon, authenticated;

-- Fix freelance_documents INSERT policy
DROP POLICY IF EXISTS "Anon can upload documents for existing registration" ON public.freelance_documents;

CREATE POLICY "Anon can upload documents for existing registration"
  ON public.freelance_documents
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    private.registration_exists_and_pending(registration_id)
  );

-- Fix freelance_periodic_documents INSERT policy  
DROP POLICY IF EXISTS "Anon can upload periodic documents for existing registration" ON public.freelance_periodic_documents;

CREATE POLICY "Anon can upload periodic documents for existing registration"
  ON public.freelance_periodic_documents
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    registration_id IS NOT NULL
    AND private.registration_exists_and_pending(registration_id)
  );
