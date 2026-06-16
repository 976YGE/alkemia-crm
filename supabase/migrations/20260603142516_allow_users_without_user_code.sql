/*
  # Allow back-office users without CRM code

  1. Schema changes
    - `users.user_code_id` becomes nullable so admins, super_admins and hr_managers can be created manually without a CRM code.
    - Add `created_by` column on `users` to trace which admin manually created the account.

  2. Security
    - Add an INSERT policy on `public.users` allowing only admins (via existing `public.is_admin()` helper) to insert rows.
    - Existing UPDATE / SELECT / DELETE policies remain unchanged.

  3. Important notes
    1. NO drop or rename: data integrity is preserved.
    2. `user_code_id` UNIQUE constraint stays; nullable values are allowed and PostgreSQL does not enforce uniqueness on NULL.
    3. The edge function `create-user` uses the service role key and bypasses RLS, but this policy keeps the table secure when accessed through the standard API.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'user_code_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.users ALTER COLUMN user_code_id DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.users ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Admins can insert users'
  ) THEN
    CREATE POLICY "Admins can insert users"
      ON public.users
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin());
  END IF;
END $$;
