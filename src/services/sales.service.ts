import { supabase } from '../lib/supabase';
import type { SalesReport } from '../types';

export interface CreateSalesReportInput {
  appointment_id: string;
  user_id: string;
  country_code: string;
  total_amount: number;
  comment?: string;
  status: 'draft' | 'validated';
  proofFile?: File;
  lines: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
  }>;
}

export interface UpdateSalesReportInput extends CreateSalesReportInput {
  id: string;
  existingProofFilePath?: string;
}

export class SalesService {
  private static async uploadProofFile(userId: string, reportId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${reportId}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('sales-proofs')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;
    return filePath;
  }

  private static async removeProofFile(filePath: string): Promise<void> {
    try {
      await supabase.storage.from('sales-proofs').remove([filePath]);
    } catch {
      // best-effort cleanup, ignore
    }
  }

  private static async deleteOrphanReport(reportId: string): Promise<void> {
    try {
      await supabase.from('sales_report_lines').delete().eq('sales_report_id', reportId);
      await supabase.from('sales_reports').delete().eq('id', reportId);
    } catch {
      // best-effort cleanup, ignore
    }
  }

  static async getProofFileUrl(filePath: string): Promise<string> {
    const { data } = await supabase.storage
      .from('sales-proofs')
      .createSignedUrl(filePath, 3600);

    if (!data?.signedUrl) throw new Error('Failed to generate signed URL');
    return data.signedUrl;
  }

  static async getSalesReportByAppointmentId(appointmentId: string): Promise<SalesReport | null> {
    const { data, error } = await supabase
      .from('sales_reports')
      .select(`
        *,
        lines:sales_report_lines(
          *,
          product:products(
            *,
            category:product_categories(*)
          )
        ),
        appointment:appointments(*)
      `)
      .eq('appointment_id', appointmentId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getSalesReportById(id: string): Promise<SalesReport | null> {
    const { data, error } = await supabase
      .from('sales_reports')
      .select(`
        *,
        lines:sales_report_lines(
          *,
          product:products(
            *,
            category:product_categories(*)
          )
        ),
        appointment:appointments(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async createSalesReport(input: CreateSalesReportInput): Promise<SalesReport> {
    const existingReport = await this.getSalesReportByAppointmentId(input.appointment_id);
    if (existingReport) {
      throw new Error('A sales report already exists for this appointment');
    }

    if (!input.proofFile) {
      throw new Error('Proof file is required');
    }

    if (!input.lines || input.lines.length === 0) {
      throw new Error('At least one product line is required');
    }

    const reportId = crypto.randomUUID();
    let proofFilePath: string | null = null;
    let reportInserted = false;

    try {
      proofFilePath = await this.uploadProofFile(input.user_id, reportId, input.proofFile);

      const { error: reportError } = await supabase
        .from('sales_reports')
        .insert({
          id: reportId,
          appointment_id: input.appointment_id,
          user_id: input.user_id,
          country_code: input.country_code,
          total_amount: input.total_amount,
          comment: input.comment || null,
          status: input.status,
          proof_file_path: proofFilePath,
          validated_at: input.status === 'validated' ? new Date().toISOString() : null
        });

      if (reportError) throw reportError;
      reportInserted = true;

      const lines = input.lines.map(line => ({
        sales_report_id: reportId,
        product_id: line.product_id,
        quantity: line.quantity,
        unit_price: line.unit_price,
        line_amount: line.quantity * line.unit_price
      }));

      const { error: linesError } = await supabase
        .from('sales_report_lines')
        .insert(lines);

      if (linesError) throw linesError;

      return await this.getSalesReportById(reportId) as SalesReport;
    } catch (err) {
      if (reportInserted) {
        await this.deleteOrphanReport(reportId);
      }
      if (proofFilePath) {
        await this.removeProofFile(proofFilePath);
      }
      throw err;
    }
  }

  static async updateSalesReport(input: UpdateSalesReportInput): Promise<SalesReport> {
    const existingReport = await this.getSalesReportById(input.id);

    if (!existingReport) {
      throw new Error('Sales report not found');
    }

    if (existingReport.exported) {
      throw new Error('Cannot modify an exported sales report');
    }

    if (!input.proofFile && !input.existingProofFilePath) {
      throw new Error('Proof file is required');
    }

    let proofFilePath = input.existingProofFilePath;

    if (input.proofFile) {
      proofFilePath = await this.uploadProofFile(input.user_id, input.id, input.proofFile);
    }

    const { error: reportError } = await supabase
      .from('sales_reports')
      .update({
        total_amount: input.total_amount,
        comment: input.comment || null,
        status: input.status,
        proof_file_path: proofFilePath,
        validated_at: input.status === 'validated' ? new Date().toISOString() : existingReport.validated_at
      })
      .eq('id', input.id);

    if (reportError) throw reportError;

    await supabase
      .from('sales_report_lines')
      .delete()
      .eq('sales_report_id', input.id);

    const lines = input.lines.map(line => ({
      sales_report_id: input.id,
      product_id: line.product_id,
      quantity: line.quantity,
      unit_price: line.unit_price,
      line_amount: line.quantity * line.unit_price
    }));

    const { error: linesError } = await supabase
      .from('sales_report_lines')
      .insert(lines);

    if (linesError) throw linesError;

    return await this.getSalesReportById(input.id) as SalesReport;
  }

  static async getUserSalesReports(userId: string): Promise<SalesReport[]> {
    const { data, error } = await supabase
      .from('sales_reports')
      .select(`
        *,
        lines:sales_report_lines(*),
        appointment:appointments(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}
