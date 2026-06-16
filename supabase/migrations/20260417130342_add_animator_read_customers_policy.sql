/*
  # Add animator read access to customers

  1. Security Changes
    - Add SELECT policy for animators: can read customers linked to their own appointments
    - Uses the appointments.customer_id join with user_code_id ownership check
    - This complements existing admin policies (admins already have full CRUD)

  2. Important Notes
    - Animators can ONLY read (SELECT) customers, no insert/update/delete
    - Access is scoped to customers they have appointments with
    - Admin policies remain unchanged (full CRUD via is_admin())
*/

CREATE POLICY "Animators can view their own customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT DISTINCT a.customer_id
      FROM appointments a
      INNER JOIN users u ON u.user_code_id = a.user_code_id
      WHERE u.id = (SELECT auth.uid())
        AND a.customer_id IS NOT NULL
    )
  );
