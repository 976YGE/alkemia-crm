import { supabase } from '../lib/supabase';

export interface UserNotificationPreferences {
  id?: string;
  user_id: string;
  notify_day_before: boolean;
  notify_end_of_day: boolean;
  notify_cr_summary: boolean;
}

export interface AdminNotificationSettings {
  id?: string;
  country_code: string;
  notify_on_cr_submit: boolean;
  notify_on_freelance_registration: boolean;
  additional_recipients: string[];
}

export class NotificationsService {
  static async getUserPreferences(userId: string): Promise<UserNotificationPreferences> {
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return {
        user_id: userId,
        notify_day_before: true,
        notify_end_of_day: true,
        notify_cr_summary: true,
      };
    }

    return data;
  }

  static async saveUserPreferences(prefs: UserNotificationPreferences): Promise<void> {
    const { error } = await supabase
      .from('user_notification_preferences')
      .upsert({
        user_id: prefs.user_id,
        notify_day_before: prefs.notify_day_before,
        notify_end_of_day: prefs.notify_end_of_day,
        notify_cr_summary: prefs.notify_cr_summary,
      }, { onConflict: 'user_id' });

    if (error) throw error;
  }

  static async getAdminSettings(countryCode: string): Promise<AdminNotificationSettings> {
    const { data, error } = await supabase
      .from('admin_notification_settings')
      .select('*')
      .eq('country_code', countryCode)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return {
        country_code: countryCode,
        notify_on_cr_submit: false,
        notify_on_freelance_registration: true,
        additional_recipients: [],
      };
    }

    return data;
  }

  static async saveAdminSettings(settings: AdminNotificationSettings): Promise<void> {
    const { error } = await supabase
      .from('admin_notification_settings')
      .upsert({
        country_code: settings.country_code,
        notify_on_cr_submit: settings.notify_on_cr_submit,
        notify_on_freelance_registration: settings.notify_on_freelance_registration,
        additional_recipients: settings.additional_recipients,
      }, { onConflict: 'country_code' });

    if (error) throw error;
  }

  static async getAllAdminSettings(): Promise<AdminNotificationSettings[]> {
    const { data, error } = await supabase
      .from('admin_notification_settings')
      .select('*')
      .order('country_code');

    if (error) throw error;
    return data || [];
  }

  static async triggerCrSummaryNotification(salesReportId: string): Promise<void> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return;

      await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'Apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          type: 'cr_summary',
          sales_report_id: salesReportId,
        }),
      });
    } catch (err) {
      console.error('[Notifications] triggerCrSummaryNotification failed:', err);
    }
  }
}
