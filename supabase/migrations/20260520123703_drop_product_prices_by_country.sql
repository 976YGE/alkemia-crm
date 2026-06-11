/*
  # Drop product_prices_by_country table

  1. Changes
    - Drop the `product_prices_by_country` table entirely
    - This table was unused (0 rows) and redundant since each product already carries its own price per country

  2. Security
    - All associated RLS policies are automatically dropped with the table
*/

DROP TABLE IF EXISTS product_prices_by_country;
