/*
  # Fix Security and Performance Issues

  ## Summary
  Comprehensive fix for all security and performance warnings.

  ## Changes

  ### 1. Fix Function Search Paths (prevents search_path injection)
  - `is_admin()` — set fixed search_path
  - `update_updated_at_column()` — set fixed search_path
  - `update_sftp_configurations_updated_at()` — set fixed search_path

  ### 2. Add Missing Foreign Key Indexes
  Covers all 12 unindexed FK columns for better JOIN/DELETE performance.

  ### 3. Drop Unused Indexes
  Removes 28 indexes that have never been used to reduce write overhead.

  ### 4. Fix RLS Policies — Auth Initialization Plan
  Replaces `auth.uid()` with `(select auth.uid())` in all policies so the
  value is computed once per query instead of once per row.

  ### 5. Fix Always-True UPDATE Policy
  `sftp_sync_operations` UPDATE policy restricted to the operation creator
  or admins instead of allowing any authenticated user to update any row.

  ### 6. Add RLS Policies for Tables With No Policies
  `customers`, `order_lines`, `orders` had RLS enabled but zero policies
  (meaning nobody could read or write them). Admin-only access is now granted.

  ### 7. Consolidate Multiple Permissive SELECT/UPDATE Policies
  Merges duplicate permissive policies into single combined policies to
  eliminate redundant evaluation and silence the advisor warnings.
*/

-- ============================================================
-- 1. FIX FUNCTION SEARCH PATHS
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid())
    AND role IN ('admin', 'super_admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_sftp_configurations_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. ADD MISSING FOREIGN KEY INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_customers_country_code
  ON public.customers (country_code);

CREATE INDEX IF NOT EXISTS idx_import_errors_log_id
  ON public.import_errors (log_id);

CREATE INDEX IF NOT EXISTS idx_order_lines_order_id
  ON public.order_lines (order_id);

CREATE INDEX IF NOT EXISTS idx_order_lines_product_id
  ON public.order_lines (product_id);

CREATE INDEX IF NOT EXISTS idx_orders_country_code
  ON public.orders (country_code);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id
  ON public.orders (customer_id);

CREATE INDEX IF NOT EXISTS idx_orders_user_id
  ON public.orders (user_id);

CREATE INDEX IF NOT EXISTS idx_product_categories_country_code
  ON public.product_categories (country_code);

CREATE INDEX IF NOT EXISTS idx_sales_report_lines_product_id
  ON public.sales_report_lines (product_id);

CREATE INDEX IF NOT EXISTS idx_sales_reports_country_code
  ON public.sales_reports (country_code);

CREATE INDEX IF NOT EXISTS idx_sftp_file_logs_created_by
  ON public.sftp_file_logs (created_by);

CREATE INDEX IF NOT EXISTS idx_sftp_sync_operations_created_by
  ON public.sftp_sync_operations (created_by);

-- ============================================================
-- 3. DROP UNUSED INDEXES
-- ============================================================

DROP INDEX IF EXISTS public.idx_users_country;
DROP INDEX IF EXISTS public.idx_sales_report_lines_report;
DROP INDEX IF EXISTS public.idx_import_export_logs_country;
DROP INDEX IF EXISTS public.idx_import_export_logs_type;
DROP INDEX IF EXISTS public.idx_products_category;
DROP INDEX IF EXISTS public.idx_products_country;
DROP INDEX IF EXISTS public.idx_products_ean;
DROP INDEX IF EXISTS public.idx_sales_reports_appointment;
DROP INDEX IF EXISTS public.idx_sales_reports_user;
DROP INDEX IF EXISTS public.idx_sales_reports_exported;
DROP INDEX IF EXISTS public.idx_connection_logs_user_id;
DROP INDEX IF EXISTS public.idx_connection_logs_created_at;
DROP INDEX IF EXISTS public.idx_connection_logs_action;
DROP INDEX IF EXISTS public.idx_sftp_configurations_country;
DROP INDEX IF EXISTS public.idx_sftp_sync_operations_config;
DROP INDEX IF EXISTS public.idx_sftp_sync_operations_status;
DROP INDEX IF EXISTS public.idx_sftp_sync_operations_created_at;
DROP INDEX IF EXISTS public.idx_user_codes_code;
DROP INDEX IF EXISTS public.idx_user_codes_country;
DROP INDEX IF EXISTS public.idx_appointments_user_code;
DROP INDEX IF EXISTS public.idx_appointments_country;
DROP INDEX IF EXISTS public.idx_appointments_date;
DROP INDEX IF EXISTS public.idx_sftp_file_logs_created_at;
DROP INDEX IF EXISTS public.idx_sftp_file_logs_operation_type;
DROP INDEX IF EXISTS public.idx_sftp_file_logs_file_type;
DROP INDEX IF EXISTS public.idx_sftp_file_logs_status;
DROP INDEX IF EXISTS public.idx_sftp_connection_logs_config_id;
DROP INDEX IF EXISTS public.idx_sftp_connection_logs_created_at;
DROP INDEX IF EXISTS public.idx_sftp_connection_logs_status;
DROP INDEX IF EXISTS public.idx_sftp_connection_logs_type;

-- ============================================================
-- 4. FIX RLS POLICIES — AUTH INITIALIZATION PLAN
--    Replace auth.uid() with (select auth.uid()) throughout
-- ============================================================

-- users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

CREATE POLICY "Users can view own profile or admins can view all"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    (id = (SELECT auth.uid()))
    OR public.is_admin()
  );

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- appointments table
DROP POLICY IF EXISTS "Appointments viewable by owner" ON public.appointments;
CREATE POLICY "Appointments viewable by owner"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    user_code_id IN (
      SELECT users.user_code_id FROM public.users
      WHERE users.id = (SELECT auth.uid())
    )
  );

-- product_categories table
DROP POLICY IF EXISTS "Product categories viewable by authenticated users in same coun" ON public.product_categories;
CREATE POLICY "Product categories viewable by authenticated users in same country"
  ON public.product_categories FOR SELECT
  TO authenticated
  USING (
    country_code IN (
      SELECT users.country_code FROM public.users
      WHERE users.id = (SELECT auth.uid())
    )
  );

-- products table
DROP POLICY IF EXISTS "Products viewable by authenticated users in same country" ON public.products;
CREATE POLICY "Products viewable by authenticated users in same country"
  ON public.products FOR SELECT
  TO authenticated
  USING (
    country_code IN (
      SELECT users.country_code FROM public.users
      WHERE users.id = (SELECT auth.uid())
    )
  );

-- import_export_logs table
DROP POLICY IF EXISTS "Import/Export logs viewable by admins" ON public.import_export_logs;
CREATE POLICY "Import/Export logs viewable by admins"
  ON public.import_export_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  );

-- import_errors table
DROP POLICY IF EXISTS "Import errors viewable by admins" ON public.import_errors;
CREATE POLICY "Import errors viewable by admins"
  ON public.import_errors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  );

-- connection_logs table — merge two SELECT policies into one
DROP POLICY IF EXISTS "Admin can view all logs" ON public.connection_logs;
DROP POLICY IF EXISTS "Super admin can view all logs" ON public.connection_logs;
CREATE POLICY "Admins can view all logs"
  ON public.connection_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- sftp_configurations table — merge duplicate SELECT policies
DROP POLICY IF EXISTS "SFTP configurations viewable by admins" ON public.sftp_configurations;
DROP POLICY IF EXISTS "Super admins can view SFTP configurations" ON public.sftp_configurations;
DROP POLICY IF EXISTS "Super admins can insert SFTP configurations" ON public.sftp_configurations;
DROP POLICY IF EXISTS "Super admins can update SFTP configurations" ON public.sftp_configurations;
DROP POLICY IF EXISTS "Super admins can delete SFTP configurations" ON public.sftp_configurations;

CREATE POLICY "Admins can view SFTP configurations"
  ON public.sftp_configurations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  );

CREATE POLICY "Super admins can insert SFTP configurations"
  ON public.sftp_configurations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'super_admin'::text
    )
  );

CREATE POLICY "Super admins can update SFTP configurations"
  ON public.sftp_configurations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'super_admin'::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'super_admin'::text
    )
  );

CREATE POLICY "Super admins can delete SFTP configurations"
  ON public.sftp_configurations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'super_admin'::text
    )
  );

-- sftp_sync_operations — fix INSERT policy auth.uid()
DROP POLICY IF EXISTS "Authenticated users can create sync operations" ON public.sftp_sync_operations;
CREATE POLICY "Authenticated users can create sync operations"
  ON public.sftp_sync_operations FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = created_by);

-- sftp_connection_logs
DROP POLICY IF EXISTS "Super admin can view all SFTP connection logs" ON public.sftp_connection_logs;
CREATE POLICY "Super admin can view all SFTP connection logs"
  ON public.sftp_connection_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = 'super_admin'::text
    )
  );

-- user_codes — fix auth.uid() in subqueries
DROP POLICY IF EXISTS "Users can view own activated user code" ON public.user_codes;
CREATE POLICY "Users can view own activated user code"
  ON public.user_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_code_id = user_codes.id
      AND users.id = (SELECT auth.uid())
    )
  );

-- sales_reports — merge duplicate SELECT and UPDATE policies
DROP POLICY IF EXISTS "Sales reports viewable by owner" ON public.sales_reports;
DROP POLICY IF EXISTS "Admins can view all sales reports" ON public.sales_reports;
DROP POLICY IF EXISTS "Sales reports insertable by owner" ON public.sales_reports;
DROP POLICY IF EXISTS "Sales reports updatable by owner if not exported" ON public.sales_reports;
DROP POLICY IF EXISTS "Admins can update all sales reports" ON public.sales_reports;

CREATE POLICY "Sales reports viewable by owner or admins"
  ON public.sales_reports FOR SELECT
  TO authenticated
  USING (
    (user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  );

CREATE POLICY "Sales reports insertable by owner"
  ON public.sales_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Sales reports updatable by owner or admins"
  ON public.sales_reports FOR UPDATE
  TO authenticated
  USING (
    ((user_id = (SELECT auth.uid())) AND (NOT exported))
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  )
  WITH CHECK (
    (user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  );

-- sales_report_lines — merge duplicate SELECT and UPDATE policies
DROP POLICY IF EXISTS "Sales report lines viewable by report owner" ON public.sales_report_lines;
DROP POLICY IF EXISTS "Admins can view all sales report lines" ON public.sales_report_lines;
DROP POLICY IF EXISTS "Sales report lines insertable by report owner" ON public.sales_report_lines;
DROP POLICY IF EXISTS "Sales report lines updatable by report owner" ON public.sales_report_lines;
DROP POLICY IF EXISTS "Admins can update all sales report lines" ON public.sales_report_lines;
DROP POLICY IF EXISTS "Sales report lines deletable by report owner" ON public.sales_report_lines;

CREATE POLICY "Sales report lines viewable by owner or admins"
  ON public.sales_report_lines FOR SELECT
  TO authenticated
  USING (
    (sales_report_id IN (
      SELECT id FROM public.sales_reports
      WHERE user_id = (SELECT auth.uid())
    ))
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  );

CREATE POLICY "Sales report lines insertable by report owner"
  ON public.sales_report_lines FOR INSERT
  TO authenticated
  WITH CHECK (
    sales_report_id IN (
      SELECT id FROM public.sales_reports
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Sales report lines updatable by owner or admins"
  ON public.sales_report_lines FOR UPDATE
  TO authenticated
  USING (
    (sales_report_id IN (
      SELECT id FROM public.sales_reports
      WHERE user_id = (SELECT auth.uid()) AND (NOT exported)
    ))
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  )
  WITH CHECK (
    (sales_report_id IN (
      SELECT id FROM public.sales_reports
      WHERE user_id = (SELECT auth.uid())
    ))
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (SELECT auth.uid())
      AND users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])
    )
  );

CREATE POLICY "Sales report lines deletable by report owner"
  ON public.sales_report_lines FOR DELETE
  TO authenticated
  USING (
    sales_report_id IN (
      SELECT id FROM public.sales_reports
      WHERE user_id = (SELECT auth.uid()) AND (NOT exported)
    )
  );

-- ============================================================
-- 5. FIX ALWAYS-TRUE UPDATE POLICY ON sftp_sync_operations
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can update sync operations" ON public.sftp_sync_operations;
CREATE POLICY "Admins or creators can update sync operations"
  ON public.sftp_sync_operations FOR UPDATE
  TO authenticated
  USING (
    (created_by = (SELECT auth.uid()))
    OR public.is_admin()
  )
  WITH CHECK (
    (created_by = (SELECT auth.uid()))
    OR public.is_admin()
  );

-- ============================================================
-- 6. ADD POLICIES FOR TABLES WITH RLS BUT NO POLICIES
--    customers, order_lines, orders — admin-only access
-- ============================================================

CREATE POLICY "Admins can view customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert customers"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update customers"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete customers"
  ON public.customers FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view order lines"
  ON public.order_lines FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert order lines"
  ON public.order_lines FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update order lines"
  ON public.order_lines FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete order lines"
  ON public.order_lines FOR DELETE
  TO authenticated
  USING (public.is_admin());
