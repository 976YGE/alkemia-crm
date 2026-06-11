/*
  # Drop unused indexes

  ## Summary
  Removes indexes that have never been used according to pg_stat_user_indexes.
  This reduces storage overhead and write amplification without any query
  performance impact.

  ## Dropped Indexes
  - notification_logs: user_id, appointment_id, created_at
  - sales_report_lines: product_id
  - import_errors: log_id
  - customers: country_code
  - orders: country_code, customer_id, user_id
  - order_lines: order_id, product_id
  - sftp_sync_operations: created_by
  - sftp_file_logs: created_by
  - product_prices_by_country: product_id, country_code
*/

DROP INDEX IF EXISTS public.idx_notification_logs_user_id;
DROP INDEX IF EXISTS public.idx_notification_logs_appointment_id;
DROP INDEX IF EXISTS public.idx_notification_logs_created_at;
DROP INDEX IF EXISTS public.idx_sales_report_lines_product_id;
DROP INDEX IF EXISTS public.idx_import_errors_log_id;
DROP INDEX IF EXISTS public.idx_customers_country_code;
DROP INDEX IF EXISTS public.idx_orders_country_code;
DROP INDEX IF EXISTS public.idx_orders_customer_id;
DROP INDEX IF EXISTS public.idx_orders_user_id;
DROP INDEX IF EXISTS public.idx_order_lines_order_id;
DROP INDEX IF EXISTS public.idx_order_lines_product_id;
DROP INDEX IF EXISTS public.idx_sftp_sync_operations_created_by;
DROP INDEX IF EXISTS public.idx_sftp_file_logs_created_by;
DROP INDEX IF EXISTS public.idx_product_prices_product_id;
DROP INDEX IF EXISTS public.idx_product_prices_country_code;
