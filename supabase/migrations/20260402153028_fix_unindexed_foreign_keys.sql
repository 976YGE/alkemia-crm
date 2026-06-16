/*
  # Add indexes for unindexed foreign keys

  ## Summary
  Adds covering indexes for all foreign key columns that were missing them.
  This improves JOIN and lookup query performance significantly.

  ## New Indexes
  - appointments: country_code, user_code_id
  - connection_logs: user_id
  - import_export_logs: country_code
  - notification_logs: sales_report_id
  - products: category_id, country_code
  - sales_reports: user_id
  - sftp_connection_logs: sftp_config_id
  - sftp_sync_operations: sftp_config_id
  - user_codes: country_code
  - users: country_code
*/

CREATE INDEX IF NOT EXISTS idx_appointments_country_code ON public.appointments (country_code);
CREATE INDEX IF NOT EXISTS idx_appointments_user_code_id ON public.appointments (user_code_id);
CREATE INDEX IF NOT EXISTS idx_connection_logs_user_id ON public.connection_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_import_export_logs_country_code ON public.import_export_logs (country_code);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sales_report_id ON public.notification_logs (sales_report_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_country_code ON public.products (country_code);
CREATE INDEX IF NOT EXISTS idx_sales_reports_user_id ON public.sales_reports (user_id);
CREATE INDEX IF NOT EXISTS idx_sftp_connection_logs_sftp_config_id ON public.sftp_connection_logs (sftp_config_id);
CREATE INDEX IF NOT EXISTS idx_sftp_sync_operations_sftp_config_id ON public.sftp_sync_operations (sftp_config_id);
CREATE INDEX IF NOT EXISTS idx_user_codes_country_code ON public.user_codes (country_code);
CREATE INDEX IF NOT EXISTS idx_users_country_code ON public.users (country_code);
