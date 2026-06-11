export type CountryCode = 'FR' | 'ES' | 'IT' | 'BE' | 'CH';

export type UserRole = 'animator' | 'admin' | 'super_admin' | 'hr_manager';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export type SalesReportStatus = 'draft' | 'validated';

export type ImportExportType = 'import_users' | 'import_products' | 'import_appointments' | 'export_sales';

export type ImportExportStatus = 'pending' | 'running' | 'success' | 'error';

export interface Country {
  id: string;
  code: CountryCode;
  name: string;
  timezone: string;
  locale: string;
  currency: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCode {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  country_code: CountryCode;
  is_active: boolean;
  is_activated: boolean;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  user_code_id: string;
  email: string;
  country_code: CountryCode;
  preferred_language: string;
  role: UserRole;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  user_code?: UserCode;
}

export interface ProductCategory {
  id: string;
  code: string;
  name: string;
  country_code: CountryCode;
  display_order: number;
  primary_color: string;
  secondary_color: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  ean: string | null;
  category_id: string;
  price: number;
  country_code: CountryCode;
  active: boolean;
  created_at: string;
  updated_at: string;
  category?: ProductCategory;
}

export interface Appointment {
  id: string;
  external_id: string | null;
  user_code_id: string;
  country_code: CountryCode;
  appointment_date: string;
  appointment_time: string;
  appointment_end_time: string | null;
  appointment_type: 'animation' | 'formation' | 'rdv_passage' | null;
  store_name: string;
  store_address: string | null;
  store_city: string | null;
  store_postal_code: string | null;
  old_crm_code: string | null;
  erp_code: string | null;
  phone: string | null;
  notes: string | null;
  status: AppointmentStatus;
  customer_id: string | null;
  report_not_required: boolean;
  created_at: string;
  updated_at: string;
  user_code?: Pick<UserCode, 'id' | 'first_name' | 'last_name' | 'code'>;
  customer?: Pick<Customer, 'id' | 'name'> | null;
}

export interface SalesReport {
  id: string;
  appointment_id: string;
  user_id: string;
  country_code: CountryCode;
  total_amount: number;
  comment: string | null;
  proof_file_path: string | null;
  status: SalesReportStatus;
  exported: boolean;
  exported_at: string | null;
  validated_at: string | null;
  created_at: string;
  updated_at: string;
  appointment?: Appointment;
  lines?: SalesReportLine[];
}

export interface SalesReportLine {
  id: string;
  sales_report_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_amount: number;
  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface SFTPConfiguration {
  id: string;
  country_code: CountryCode;
  host: string;
  port: number;
  username: string;
  import_path: string;
  export_path: string;
  active: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportExportLog {
  id: string;
  type: ImportExportType;
  country_code: CountryCode;
  filename: string;
  status: ImportExportStatus;
  started_at: string | null;
  completed_at: string | null;
  rows_processed: number;
  rows_success: number;
  rows_error: number;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ImportError {
  id: string;
  log_id: string;
  row_number: number | null;
  error_message: string;
  raw_data: Record<string, unknown> | null;
  created_at: string;
}

export interface Customer {
  id: string;
  external_id: string | null;
  erp_code: string | null;
  old_crm_code: string | null;
  source: 'import' | 'manual';
  name: string;
  country_code: CountryCode;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  type: 'prospect' | 'client' | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CustomerWithStats extends Customer {
  appointment_count: number;
  last_appointment_date: string | null;
}

export interface Order {
  id: string;
  external_id: string | null;
  customer_id: string;
  user_id: string;
  country_code: CountryCode;
  order_date: string;
  total_amount: number;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OrderLine {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_amount: number;
  created_at: string;
  updated_at: string;
}

export type FreelanceRegistrationStatus = 'pending' | 'revision_requested' | 'approved' | 'rejected' | 'finalized';

export type DocumentReviewStatus = 'pending' | 'approved' | 'rejected';

export type FreelanceDocumentType = 'rib' | 'cv' | 'id_card_front' | 'id_card_back' | 'kbis_or_rne';

export type PeriodicDocumentType = 'urssaf_vigilance' | 'fiscal_regularity';

export type PeriodicDocumentStatus = 'valid' | 'expiring_soon' | 'expired';

export interface FreelanceRegistration {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  delivery_same_as_postal: boolean;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_postal_code: string | null;
  delivery_country: string | null;
  siret: string;
  company_registration_date: string;
  remuneration: string;
  intervention_frequency: string;
  first_animation_date: string;
  last_animation_date: string | null;
  status: FreelanceRegistrationStatus;
  validated_by: string | null;
  validated_at: string | null;
  rejection_reason: string | null;
  user_code: string | null;
  country_code: CountryCode | null;
  user_id: string | null;
  revision_token: string | null;
  revision_token_expires_at: string | null;
  submitted_at: string;
  ip_address: string | null;
  form_started_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FreelanceDocument {
  id: string;
  registration_id: string;
  document_type: FreelanceDocumentType;
  file_path: string;
  original_filename: string;
  uploaded_at: string;
  review_status: DocumentReviewStatus;
  review_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface FreelancePeriodicDocument {
  id: string;
  registration_id: string | null;
  user_id: string | null;
  document_type: PeriodicDocumentType;
  file_path: string;
  original_filename: string;
  uploaded_at: string;
  expires_at: string;
  reminder_sent_at: string | null;
  status: PeriodicDocumentStatus;
  review_status: DocumentReviewStatus;
  review_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}
