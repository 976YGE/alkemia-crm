/*
  # Product Catalog Admin - Prices by Country & Category Colors

  ## Summary
  This migration enhances the product catalog management for administrators:

  ## Changes

  ### 1. New Table: `product_prices_by_country`
  Stores country-specific prices for products, allowing the same product to have
  different prices in different countries. This table coexists with the existing
  `price` column on the `products` table (which acts as a default/fallback price).

  Columns:
  - `id` (uuid) - Primary key
  - `product_id` (uuid) - References products table
  - `country_code` (text) - Country code (FR, ES, IT, BE, CH)
  - `price` (numeric) - Country-specific price
  - `active` (boolean) - Whether this price override is active
  - `created_at` / `updated_at` - Timestamps

  Unique constraint: one price per product per country.

  ### 2. Modified Table: `product_categories`
  The `primary_color` and `secondary_color` columns already exist from the initial
  schema. No changes needed to the categories table structure.

  ### 3. Security
  - RLS enabled on `product_prices_by_country`
  - Authenticated users can read prices (needed for sales reports)
  - Only super_admin can insert, update, delete prices
*/

CREATE TABLE IF NOT EXISTS product_prices_by_country (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  country_code text NOT NULL CHECK (country_code IN ('FR', 'ES', 'IT', 'BE', 'CH')),
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, country_code)
);

ALTER TABLE product_prices_by_country ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read product prices"
  ON product_prices_by_country FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can insert product prices"
  ON product_prices_by_country FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update product prices"
  ON product_prices_by_country FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete product prices"
  ON product_prices_by_country FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_product_prices_product_id ON product_prices_by_country(product_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_country_code ON product_prices_by_country(country_code);

CREATE OR REPLACE FUNCTION update_product_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_prices_updated_at
  BEFORE UPDATE ON product_prices_by_country
  FOR EACH ROW
  EXECUTE FUNCTION update_product_prices_updated_at();

CREATE POLICY "Super admins can manage all products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can manage all categories"
  ON product_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admins can insert categories"
  ON product_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update categories"
  ON product_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );
