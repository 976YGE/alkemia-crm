import { supabase } from '../lib/supabase';
import type { AppointmentWithReport } from '../types';
import { isPast, parseISO } from 'date-fns';

const PAGE_SIZE = 500;
const CHUNK_SIZE = 100;

async function fetchAllPages<T>(
  queryBuilder: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const results: T[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await queryBuilder(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    results.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return results;
}

async function fetchReportsForIds(ids: string[]): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase
      .from('sales_reports')
      .select('*')
      .in('appointment_id', chunk);
    if (error) throw error;
    if (data) results.push(...(data as Record<string, unknown>[]));
  }
  return results;
}

function buildAppointmentWithReports(
  appointments: Record<string, unknown>[],
  reports: Record<string, unknown>[]
): AppointmentWithReport[] {
  const reportsMap = new Map(
    (reports || []).map(report => [report.appointment_id as string, report])
  );

  return appointments.map(appointment => {
    const appointmentDateTime = parseISO(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const is_past = isPast(appointmentDateTime);
    const sales_report = reportsMap.get(appointment.id as string);
    const has_report = !!sales_report;
    const report_not_required = !!(appointment as Record<string, unknown>).report_not_required;
    const is_formation = (appointment as Record<string, unknown>).appointment_type === 'formation';
    return {
      ...(appointment as AppointmentWithReport),
      sales_report: sales_report as AppointmentWithReport['sales_report'],
      is_past,
      can_report: is_past && !has_report && !report_not_required && !is_formation
    };
  });
}

export class AppointmentsService {
  static async getAllAppointments(): Promise<AppointmentWithReport[]> {
    const appointments = await fetchAllPages((from, to) =>
      supabase
        .from('appointments')
        .select('*, user_code:user_codes!user_code_id(id, first_name, last_name, code), customer:customers!customer_id(id, name)')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .range(from, to)
    );

    if (appointments.length === 0) return [];

    const appointmentIds = appointments.map(a => (a as Record<string, unknown>).id as string);
    const reports = await fetchReportsForIds(appointmentIds);

    return buildAppointmentWithReports(
      appointments as Record<string, unknown>[],
      reports
    );
  }

  static async getUserAppointments(userCodeId: string): Promise<AppointmentWithReport[]> {
    if (!userCodeId) return [];

    const appointments = await fetchAllPages((from, to) =>
      supabase
        .from('appointments')
        .select('*')
        .eq('user_code_id', userCodeId)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .range(from, to)
    );

    if (appointments.length === 0) return [];

    const appointmentIds = appointments.map(a => (a as Record<string, unknown>).id as string);
    const reports = await fetchReportsForIds(appointmentIds);

    return buildAppointmentWithReports(
      appointments as Record<string, unknown>[],
      reports
    );
  }

  static async getAppointmentById(id: string): Promise<AppointmentWithReport | null> {
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (appointmentError) throw appointmentError;
    if (!appointment) return null;

    const [reportResult, userCodeResult] = await Promise.all([
      supabase
        .from('sales_reports')
        .select('*, lines:sales_report_lines(*, product:products(*, category:product_categories(*)))')
        .eq('appointment_id', id)
        .maybeSingle(),
      supabase
        .from('user_codes')
        .select('id, first_name, last_name, code')
        .eq('id', appointment.user_code_id)
        .maybeSingle()
    ]);

    if (reportResult.error) throw reportResult.error;
    if (userCodeResult.error) throw userCodeResult.error;

    const appointmentDateTime = parseISO(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const is_past = isPast(appointmentDateTime);
    const has_report = !!reportResult.data;

    return {
      ...appointment,
      user_code: userCodeResult.data || undefined,
      sales_report: reportResult.data || undefined,
      is_past,
      can_report: is_past && !has_report && !appointment.report_not_required && appointment.appointment_type !== 'formation'
    };
  }

  static async getUpcomingAppointments(userCodeId: string): Promise<AppointmentWithReport[]> {
    const appointments = await this.getUserAppointments(userCodeId);
    return appointments.filter(a => !a.is_past);
  }

  static async getPastAppointments(userCodeId: string): Promise<AppointmentWithReport[]> {
    const appointments = await this.getUserAppointments(userCodeId);
    return appointments.filter(a => a.is_past);
  }

  static async getAppointmentsNeedingReport(userCodeId: string): Promise<AppointmentWithReport[]> {
    const appointments = await this.getUserAppointments(userCodeId);
    return appointments.filter(a => a.can_report);
  }
}
