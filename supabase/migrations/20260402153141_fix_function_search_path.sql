/*
  # Fix mutable search_path on trigger function

  ## Summary
  Sets a fixed search_path on the `update_product_prices_updated_at` function
  to prevent search_path injection attacks. This is a security best practice
  for all database functions.
*/

CREATE OR REPLACE FUNCTION public.update_product_prices_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
