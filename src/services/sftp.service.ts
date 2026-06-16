import { supabase } from '../lib/supabase';
import type { CountryCode } from '../types/database';

export interface SFTPConfig {
  id: string;
  country_code: CountryCode;
  host: string;
  port: number;
  username: string;
  password_encrypted: string;
  import_path: string;
  export_path: string;
  active: boolean;
  last_sync_at: string | null;
  schedule_enabled: boolean;
  schedule_times: string[];
  last_scheduled_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SFTPConfigInput {
  country_code: CountryCode;
  host: string;
  port: number;
  username: string;
  password: string;
  import_path: string;
  export_path: string;
  active: boolean;
}

export interface SyncOperation {
  id: string;
  sftp_config_id: string;
  operation_type: 'import' | 'export' | 'export_csv';
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  files_processed: number;
  files_failed: number;
  error_message: string | null;
  details: any;
  created_at?: string;
  created_by: string;
  requester_ip?: string | null;
  triggered_by: 'manual' | 'schedule' | 'retry';
  retry_count: number;
  parent_operation_id: string | null;
  country_code?: string;
}

export interface ScheduleAlert {
  id: string;
  sftp_config_id: string;
  alert_type: 'max_retries_reached' | 'schedule_failure';
  operation_ids: string[];
  recipients: string[];
  sent_at: string | null;
  details: any;
  created_at: string;
}

async function getFreshAccessToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) throw new Error('Non authentifié');

  const expiresAt = session.expires_at ?? 0;
  const now = Math.floor(Date.now() / 1000);

  if (expiresAt - now < 60) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session) throw new Error('Impossible de rafraîchir la session');
    return refreshed.session.access_token;
  }

  return session.access_token;
}

export class SFTPService {
  static async getAllConfigurations(): Promise<SFTPConfig[]> {
    const { data, error } = await supabase
      .from('sftp_configurations')
      .select('*')
      .order('country_code');

    if (error) throw error;
    return data || [];
  }

  static async getConfigurationByCountry(countryCode: CountryCode): Promise<SFTPConfig | null> {
    const { data, error } = await supabase
      .from('sftp_configurations')
      .select('*')
      .eq('country_code', countryCode)
      .eq('active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async createConfiguration(config: SFTPConfigInput): Promise<SFTPConfig> {
    const encrypted = btoa(config.password);

    const { data, error } = await supabase
      .from('sftp_configurations')
      .insert({
        country_code: config.country_code,
        host: config.host,
        port: config.port,
        username: config.username,
        password_encrypted: encrypted,
        import_path: config.import_path,
        export_path: config.export_path,
        active: config.active,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateConfiguration(id: string, config: Partial<SFTPConfigInput>): Promise<SFTPConfig> {
    const updateData: any = {
      ...config,
    };

    if (config.password) {
      updateData.password_encrypted = btoa(config.password);
      delete updateData.password;
    }

    const { data, error } = await supabase
      .from('sftp_configurations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteConfiguration(id: string): Promise<void> {
    const { error } = await supabase
      .from('sftp_configurations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async testConnection(config: SFTPConfigInput): Promise<{ success: boolean; message: string }> {
    try {
      const accessToken = await getFreshAccessToken();

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-sftp`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors du test de connexion',
      };
    }
  }

  static decryptPassword(encrypted: string): string {
    try {
      return atob(encrypted);
    } catch {
      return '';
    }
  }

  static async importFromSFTP(configId: string): Promise<{ success: boolean; message: string; operationId?: string }> {
    try {
      const accessToken = await getFreshAccessToken();

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sftp-import`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ configId }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors de l\'import SFTP',
      };
    }
  }

  static async exportToSFTP(configId: string): Promise<{ success: boolean; message: string; operationId?: string }> {
    try {
      const accessToken = await getFreshAccessToken();

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sftp-export`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ configId }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors de l\'export SFTP',
      };
    }
  }

  static async getSyncOperations(limit: number = 50): Promise<SyncOperation[]> {
    const { data, error } = await supabase
      .from('sftp_sync_operations')
      .select('*, sftp_config:sftp_configurations!sftp_config_id(country_code)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(({ sftp_config, ...rest }) => ({
      ...rest,
      country_code: sftp_config?.country_code || undefined,
    }));
  }

  static async getSyncOperationsByConfig(configId: string, limit: number = 20): Promise<SyncOperation[]> {
    const { data, error } = await supabase
      .from('sftp_sync_operations')
      .select('*')
      .eq('sftp_config_id', configId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async updateSchedule(
    id: string,
    schedule: { schedule_enabled: boolean; schedule_times: string[] }
  ): Promise<SFTPConfig> {
    const { data, error } = await supabase
      .from('sftp_configurations')
      .update({
        schedule_enabled: schedule.schedule_enabled,
        schedule_times: schedule.schedule_times,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getScheduleAlerts(configId?: string, limit: number = 10): Promise<ScheduleAlert[]> {
    let query = supabase
      .from('sftp_schedule_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (configId) {
      query = query.eq('sftp_config_id', configId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async processImportFile(
    countryCode: CountryCode,
    fileType: 'users' | 'products' | 'appointments',
    fileContent: string,
    filename: string
  ): Promise<{ success: boolean; message: string; logId?: string; result?: any }> {
    try {
      const accessToken = await getFreshAccessToken();

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-imports`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          countryCode,
          fileType,
          fileContent,
          filename,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        return {
          success: false,
          message: result.error || 'Erreur lors du traitement du fichier',
        };
      }

      return {
        success: true,
        message: `Fichier traité: ${result.result.success}/${result.result.processed} lignes importées`,
        logId: result.logId,
        result: result.result,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors du traitement du fichier',
      };
    }
  }
}
