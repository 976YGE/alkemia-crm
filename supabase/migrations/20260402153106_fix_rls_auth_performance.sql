/*
  # Fix RLS auth() performance issues

  ## Summary
  Replaces bare `auth.uid()` calls with `(select auth.uid())` in RLS policies
  to prevent per-row re-evaluation. Also consolidates multiple permissive SELECT
  policies into single policies using OR logic.

  ## Tables Fixed
  - products: insert, update SELECT policies
  - product_prices_by_country: insert, update, delete policies
  - product_categories: insert, update policies

  ## Multiple Permissive Policies Consolidated
  - appointments SELECT: merged "Admins can view all" + "Appointments viewable by owner"
  - countries SELECT: merged into single policy
  - product_categories SELECT: merged into single policy
  - products SELECT: merged into single policy
  - sftp_configurations SELECT: merged into single policy
  - user_codes SELECT: merged into single policy
  - user_codes UPDATE: merged into single policy
  - user_notification_preferences SELECT: merged into single policy
*/

-- ============================================================
-- PRODUCTS: fix auth() in INSERT/UPDATE + merge SELECT policies
-- ============================================================

DROP POLICY IF EXISTS "Super admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Super admins can update products" ON public.products;
DROP POLICY IF EXISTS "Products viewable by authenticated users in same country" ON public.products;
DROP POLICY IF EXISTS "Super admins can manage all products" ON public.products;

CREATE POLICY "Products viewable by authenticated users"
  ON public.products FOR SELECT
  TO authenticated
  USING (
    country_code IN (SELECT country_code FROM users WHERE id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role = 'super_admin')
  );

CREATE POLICY "Super admins can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role = 'super_admin')
  );

CREATE POLICY "Super admins can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role = 'super_admin')
  );

-- ============================================================
-- PRODUCT_PRICES_BY_COUNTRY: fix auth() in INSERT/UPDATE/DELETE
-- ============================================================

DROP POLICY IF EXISTS "Super admins can insert product prices" ON public.product_prices_by_country;
DROP POLICY IF EXISTS "Super admins can update product prices" ON public.product_prices_by_country;
DROP POLICY IF EXISTS "Super admins can delete product prices" ON public.product_prices_by_country;

CREATE POLICY "Super admins can insert product prices"
  ON public.product_prices_by_country FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role = 'super_admin')
  );

CREATE POLICY "Super admins can update product prices"
  ON public.product_prices_by_country FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role = 'super_admin')
  );

CREATE POLICY "Super admins can delete product prices"
  ON public.product_prices_by_country FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role = 'super_admin')
  );

-- ============================================================
-- PRODUCT_CATEGORIES: fix auth() in INSERT/UPDATE + merge SELECT
-- ============================================================

DROP POLICY IF EXISTS "Super admins can insert categories" ON public.product_categories;
DROP POLICY IF EXISTS "Super admins can update categories" ON public.product_categories;
DROP POLICY IF EXISTS "Product categories viewable by authenticated users in same coun" ON public.product_categories;
DROP POLICY IF EXISTS "Super admins can manage all categories" ON public.product_categories;

CREATE POLICY "Product categories viewable by authenticated users"
  ON public.product_categories FOR SELECT
  TO authenticated
  USING (
    country_code IN (SELECT country_code FROM users WHERE id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role = 'super_admin')
  );

CREATE POLICY "Super admins can insert categories"
  ON public.product_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role = 'super_admin')
  );

CREATE POLICY "Super admins can update categories"
  ON public.product_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role = 'super_admin')
  );

-- ============================================================
-- APPOINTMENTS: merge multiple permissive SELECT policies
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Appointments viewable by owner" ON public.appointments;

CREATE POLICY "Appointments viewable by owner or admin"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR user_code_id IN (SELECT user_code_id FROM users WHERE id = (SELECT auth.uid()))
  );

-- ============================================================
-- COUNTRIES: merge multiple permissive SELECT policies
-- ============================================================

DROP POLICY IF EXISTS "Countries are viewable by everyone" ON public.countries;
DROP POLICY IF EXISTS "Public can view countries with active SFTP" ON public.countries;

CREATE POLICY "Countries are viewable by everyone"
  ON public.countries FOR SELECT
  USING (true);

-- ============================================================
-- SFTP_CONFIGURATIONS: merge multiple permissive SELECT policies
-- ============================================================

DROP POLICY IF EXISTS "Admins can view SFTP configurations" ON public.sftp_configurations;
DROP POLICY IF EXISTS "Public can check SFTP configuration existence" ON public.sftp_configurations;

CREATE POLICY "SFTP configurations viewable by admins or public active check"
  ON public.sftp_configurations FOR SELECT
  USING (
    active = true
    OR EXISTS (SELECT 1 FROM users WHERE id = (SELECT auth.uid()) AND role = ANY (ARRAY['admin', 'super_admin']))
  );

-- ============================================================
-- USER_CODES: merge multiple permissive SELECT and UPDATE policies
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all user codes" ON public.user_codes;
DROP POLICY IF EXISTS "User codes are viewable for activation" ON public.user_codes;
DROP POLICY IF EXISTS "Users can view own activated user code" ON public.user_codes;

CREATE POLICY "User codes viewable by owner, admin, or for activation"
  ON public.user_codes FOR SELECT
  USING (
    is_admin()
    OR NOT is_activated
    OR EXISTS (SELECT 1 FROM users WHERE users.user_code_id = user_codes.id AND users.id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can update all user codes" ON public.user_codes;
DROP POLICY IF EXISTS "User codes can be updated for activation" ON public.user_codes;

CREATE POLICY "User codes updatable by admin or for activation"
  ON public.user_codes FOR UPDATE
  USING (
    is_admin()
    OR NOT is_activated
  )
  WITH CHECK (
    is_admin()
    OR is_activated = true
  );

-- ============================================================
-- USER_NOTIFICATION_PREFERENCES: merge multiple permissive SELECT
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all notification preferences" ON public.user_notification_preferences;
DROP POLICY IF EXISTS "Users can view own notification preferences" ON public.user_notification_preferences;

CREATE POLICY "Notification preferences viewable by owner or admin"
  ON public.user_notification_preferences FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR user_id = (SELECT auth.uid())
  );
