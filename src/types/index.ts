export * from './database';

import type { Product, ProductCategory, Appointment, SalesReport } from './database';

export interface AuthUser {
  id: string;
  email: string;
  user_code_id: string;
  country_code: string;
  preferred_language: string;
  role: string;
  first_name: string;
  last_name: string;
}

export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

export interface ProductWithQuantity extends Product {
  quantity: number;
}

export interface CategoryWithProducts {
  category: ProductCategory;
  products: ProductWithQuantity[];
}

export interface AppointmentWithReport extends Appointment {
  sales_report?: SalesReport;
  is_past: boolean;
  can_report: boolean;
}
