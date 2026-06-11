import { supabase } from '../lib/supabase';
import type { Customer, CustomerWithStats, CountryCode } from '../types';

const PAGE_SIZE = 500;

export const CustomersService = {
  async getCustomers(): Promise<CustomerWithStats[]> {
    const all: CustomerWithStats[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      all.push(...data.map((c: Customer) => ({
        ...c,
        appointment_count: 0,
        last_appointment_date: null,
      })));

      if (data.length < PAGE_SIZE) hasMore = false;
      from += PAGE_SIZE;
    }

    const customerIds = all.map(c => c.id);
    if (customerIds.length > 0) {
      const { data: stats } = await supabase
        .from('appointments')
        .select('customer_id, appointment_date')
        .in('customer_id', customerIds);

      if (stats) {
        const countMap = new Map<string, { count: number; lastDate: string | null }>();
        for (const row of stats) {
          const existing = countMap.get(row.customer_id) || { count: 0, lastDate: null };
          existing.count++;
          if (!existing.lastDate || row.appointment_date > existing.lastDate) {
            existing.lastDate = row.appointment_date;
          }
          countMap.set(row.customer_id, existing);
        }
        for (const customer of all) {
          const s = countMap.get(customer.id);
          if (s) {
            customer.appointment_count = s.count;
            customer.last_appointment_date = s.lastDate;
          }
        }
      }
    }

    return all;
  },

  async getCustomerById(id: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getCustomerAppointments(customerId: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        user_code:user_codes(id, first_name, last_name, code),
        sales_report:sales_reports(id, status, total_amount, exported)
      `)
      .eq('customer_id', customerId)
      .order('appointment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createCustomer(input: {
    name: string;
    country_code: CountryCode;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    type?: 'prospect' | 'client';
  }): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        ...input,
        source: 'manual',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
