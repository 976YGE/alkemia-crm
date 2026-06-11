import { supabase } from '../lib/supabase';
import type { FreelanceRegistration, FreelanceDocument, FreelancePeriodicDocument, CountryCode, DocumentReviewStatus } from '../types/database';

export interface FreelanceFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  delivery_same_as_postal: boolean;
  delivery_address: string;
  delivery_city: string;
  delivery_postal_code: string;
  delivery_country: string;
  siret: string;
  company_registration_date: string;
  remuneration: string;
  intervention_frequency: string;
  first_animation_date: string;
  last_animation_date: string;
  form_started_at: string;
}

export interface DocumentUpload {
  type: FreelanceDocument['document_type'];
  file: File;
}

export interface PeriodicDocumentUpload {
  type: FreelancePeriodicDocument['document_type'];
  file: File;
  expires_at: string;
}

export class FreelanceService {
  static async submitRegistration(
    formData: FreelanceFormData,
    documents: DocumentUpload[],
    periodicDocuments: PeriodicDocumentUpload[]
  ): Promise<{ id: string }> {
    const registrationId = crypto.randomUUID();

    const { error: regError } = await supabase
      .from('freelance_registrations')
      .insert({
        id: registrationId,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        postal_code: formData.postal_code,
        country: formData.country,
        delivery_same_as_postal: formData.delivery_same_as_postal,
        delivery_address: formData.delivery_same_as_postal ? null : formData.delivery_address,
        delivery_city: formData.delivery_same_as_postal ? null : formData.delivery_city,
        delivery_postal_code: formData.delivery_same_as_postal ? null : formData.delivery_postal_code,
        delivery_country: formData.delivery_same_as_postal ? null : formData.delivery_country,
        siret: formData.siret,
        company_registration_date: formData.company_registration_date,
        remuneration: formData.remuneration,
        intervention_frequency: formData.intervention_frequency,
        first_animation_date: formData.first_animation_date,
        last_animation_date: formData.last_animation_date || null,
        form_started_at: formData.form_started_at,
      });

    if (regError) throw regError;

    for (const doc of documents) {
      const ext = doc.file.name.split('.').pop();
      const filePath = `registrations/${registrationId}/${doc.type}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('freelance-documents')
        .upload(filePath, doc.file);

      if (uploadError) throw uploadError;

      const { error: docError } = await supabase
        .from('freelance_documents')
        .insert({
          registration_id: registrationId,
          document_type: doc.type,
          file_path: filePath,
          original_filename: doc.file.name,
        });

      if (docError) throw docError;
    }

    for (const pdoc of periodicDocuments) {
      const ext = pdoc.file.name.split('.').pop();
      const filePath = `registrations/${registrationId}/periodic/${pdoc.type}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('freelance-documents')
        .upload(filePath, pdoc.file);

      if (uploadError) throw uploadError;

      const { error: pdocError } = await supabase
        .from('freelance_periodic_documents')
        .insert({
          registration_id: registrationId,
          document_type: pdoc.type,
          file_path: filePath,
          original_filename: pdoc.file.name,
          expires_at: pdoc.expires_at,
        });

      if (pdocError) throw pdocError;
    }

    await FreelanceService.notifyRegistration(registrationId);

    return { id: registrationId };
  }

  private static async notifyRegistration(registrationId: string): Promise<void> {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-freelance-notification`;
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'registration_submitted', registrationId }),
      });
    } catch {
      // Non-blocking: notification failure shouldn't block the registration
    }
  }

  static async getRegistrations(statusFilter?: string): Promise<FreelanceRegistration[]> {
    let query = supabase
      .from('freelance_registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async getRegistrationById(id: string): Promise<FreelanceRegistration | null> {
    const { data, error } = await supabase
      .from('freelance_registrations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getRegistrationDocuments(registrationId: string): Promise<FreelanceDocument[]> {
    const { data, error } = await supabase
      .from('freelance_documents')
      .select('*')
      .eq('registration_id', registrationId);

    if (error) throw error;
    return data || [];
  }

  static async getRegistrationPeriodicDocuments(registrationId: string): Promise<FreelancePeriodicDocument[]> {
    const { data, error } = await supabase
      .from('freelance_periodic_documents')
      .select('*')
      .eq('registration_id', registrationId);

    if (error) throw error;
    return data || [];
  }

  static async approveRegistration(
    id: string,
    userCode: string,
    countryCode: CountryCode,
    validatedBy: string
  ): Promise<void> {
    const { data: registration, error: regError } = await supabase
      .from('freelance_registrations')
      .select('first_name, last_name')
      .eq('id', id)
      .single();

    if (regError) throw regError;

    const { error: ucError } = await supabase
      .from('user_codes')
      .insert({
        code: userCode,
        first_name: registration.first_name,
        last_name: registration.last_name,
        country_code: countryCode,
        is_active: true,
        is_freelance: true,
        is_activated: false,
      });

    if (ucError) throw ucError;

    const { error: updateError } = await supabase
      .from('freelance_registrations')
      .update({
        status: 'approved',
        validated_by: validatedBy,
        validated_at: new Date().toISOString(),
        user_code: userCode,
        country_code: countryCode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-freelance-notification`;
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'registration_approved', registrationId: id }),
      });
    } catch {
      // Non-blocking
    }
  }

  static async rejectRegistration(id: string, reason: string, rejectedBy: string): Promise<void> {
    const { error } = await supabase
      .from('freelance_registrations')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        validated_by: rejectedBy,
        validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-freelance-notification`;
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'registration_rejected', registrationId: id }),
      });
    } catch {
      // Non-blocking
    }
  }

  static async getDocumentUrl(filePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('freelance-documents')
      .createSignedUrl(filePath, 3600);

    if (error) throw error;
    return data.signedUrl;
  }

  static async getAllPeriodicDocuments(): Promise<(FreelancePeriodicDocument & { registration?: Pick<FreelanceRegistration, 'first_name' | 'last_name' | 'email'> })[]> {
    const { data, error } = await supabase
      .from('freelance_periodic_documents')
      .select('*, registration:freelance_registrations(first_name, last_name, email)')
      .order('expires_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async getUserPeriodicDocuments(userId: string): Promise<FreelancePeriodicDocument[]> {
    const { data, error } = await supabase
      .from('freelance_periodic_documents')
      .select('*')
      .eq('user_id', userId)
      .order('expires_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async uploadPeriodicDocument(
    userId: string,
    documentType: FreelancePeriodicDocument['document_type'],
    file: File
  ): Promise<void> {
    const ext = file.name.split('.').pop();
    const filePath = `users/${userId}/periodic/${documentType}_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('freelance-documents')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const expiresAt = new Date();
    if (documentType === 'urssaf_vigilance') {
      expiresAt.setMonth(expiresAt.getMonth() + 6);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    const { error: docError } = await supabase
      .from('freelance_periodic_documents')
      .insert({
        user_id: userId,
        document_type: documentType,
        file_path: filePath,
        original_filename: file.name,
        expires_at: expiresAt.toISOString(),
        status: 'valid',
      });

    if (docError) throw docError;
  }

  static async reviewDocument(
    documentId: string,
    status: DocumentReviewStatus,
    comment: string | null,
    reviewedBy: string
  ): Promise<void> {
    const { error } = await supabase
      .from('freelance_documents')
      .update({
        review_status: status,
        review_comment: comment,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    if (error) throw error;
  }

  static async reviewPeriodicDocument(
    documentId: string,
    status: DocumentReviewStatus,
    comment: string | null,
    reviewedBy: string
  ): Promise<void> {
    const { error } = await supabase
      .from('freelance_periodic_documents')
      .update({
        review_status: status,
        review_comment: comment,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    if (error) throw error;
  }

  static async requestRevision(
    registrationId: string,
    requestedBy: string
  ): Promise<void> {
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error } = await supabase
      .from('freelance_registrations')
      .update({
        status: 'revision_requested',
        revision_token: token,
        revision_token_expires_at: expiresAt.toISOString(),
        validated_by: requestedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', registrationId);

    if (error) throw error;

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-freelance-notification`;
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'revision_requested', registrationId }),
      });
    } catch {
      // Non-blocking
    }
  }

  static async getRegistrationByToken(token: string): Promise<FreelanceRegistration | null> {
    const { data, error } = await supabase
      .from('freelance_registrations')
      .select('*')
      .eq('revision_token', token)
      .eq('status', 'revision_requested')
      .maybeSingle();

    if (error) throw error;
    if (data && data.revision_token_expires_at) {
      if (new Date(data.revision_token_expires_at) < new Date()) return null;
    }
    return data;
  }

  static async getDocumentsByToken(token: string): Promise<FreelanceDocument[]> {
    const registration = await FreelanceService.getRegistrationByToken(token);
    if (!registration) return [];

    const { data, error } = await supabase
      .from('freelance_documents')
      .select('*')
      .eq('registration_id', registration.id);

    if (error) throw error;
    return data || [];
  }

  static async getPeriodicDocumentsByToken(token: string): Promise<FreelancePeriodicDocument[]> {
    const registration = await FreelanceService.getRegistrationByToken(token);
    if (!registration) return [];

    const { data, error } = await supabase
      .from('freelance_periodic_documents')
      .select('*')
      .eq('registration_id', registration.id);

    if (error) throw error;
    return data || [];
  }

  static async resubmitDocument(
    registrationId: string,
    documentId: string,
    file: File
  ): Promise<void> {
    const ext = file.name.split('.').pop();
    const { data: existing } = await supabase
      .from('freelance_documents')
      .select('document_type, file_path')
      .eq('id', documentId)
      .single();

    if (!existing) throw new Error('Document not found');

    const filePath = `registrations/${registrationId}/${existing.document_type}_revised.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('freelance-documents')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { error: updateError } = await supabase
      .from('freelance_documents')
      .update({
        file_path: filePath,
        original_filename: file.name,
        uploaded_at: new Date().toISOString(),
        review_status: 'pending',
        review_comment: null,
      })
      .eq('id', documentId);

    if (updateError) throw updateError;
  }

  static async resubmitPeriodicDocument(
    registrationId: string,
    documentId: string,
    file: File
  ): Promise<void> {
    const ext = file.name.split('.').pop();
    const { data: existing } = await supabase
      .from('freelance_periodic_documents')
      .select('document_type, file_path')
      .eq('id', documentId)
      .single();

    if (!existing) throw new Error('Document not found');

    const filePath = `registrations/${registrationId}/periodic/${existing.document_type}_revised.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('freelance-documents')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const expiresAt = new Date();
    if (existing.document_type === 'urssaf_vigilance') {
      expiresAt.setMonth(expiresAt.getMonth() + 6);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    const { error: updateError } = await supabase
      .from('freelance_periodic_documents')
      .update({
        file_path: filePath,
        original_filename: file.name,
        uploaded_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        review_status: 'pending',
        review_comment: null,
      })
      .eq('id', documentId);

    if (updateError) throw updateError;
  }

  static async completeRevision(registrationId: string, token: string): Promise<void> {
    const registration = await FreelanceService.getRegistrationByToken(token);
    if (!registration || registration.id !== registrationId) {
      throw new Error('Lien invalide ou expiré');
    }

    const { error } = await supabase
      .from('freelance_registrations')
      .update({
        status: 'pending',
        revision_token: null,
        revision_token_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', registrationId);

    if (error) throw error;

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-freelance-notification`;
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'revision_resubmitted', registrationId }),
      });
    } catch {
      // Non-blocking
    }
  }
}
