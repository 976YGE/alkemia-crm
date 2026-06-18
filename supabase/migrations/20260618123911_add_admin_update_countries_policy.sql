CREATE POLICY "admin_update_countries"
  ON countries
  FOR UPDATE
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());
