import { supabase } from '../lib/supabase';
import i18n from '../lib/i18n';
import type { AuthUser, UserCode } from '../types';

export class AuthService {
  private static sessionLoggedKey = 'last_connection_logged';

  static async logConnection(
    userId: string,
    action: 'login' | 'logout' | 'failed_login'
  ): Promise<void> {
    try {
      await supabase.from('connection_logs').insert({
        user_id: userId,
        action,
        ip_address: null,
        user_agent: navigator.userAgent
      });
    } catch (error) {
      console.error('Error logging connection:', error);
    }
  }

  static async logSessionIfNeeded(userId: string): Promise<void> {
    const lastLogged = sessionStorage.getItem(this.sessionLoggedKey);
    if (lastLogged === userId) return;
    sessionStorage.setItem(this.sessionLoggedKey, userId);
    await this.logConnection(userId, 'login');
  }
  static async getAvailableCountries(): Promise<Array<{ code: string; name: string }>> {
    const { data, error } = await supabase
      .from('countries')
      .select('code, name')
      .eq('active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  static async verifyUserCode(code: string, countryCode: string): Promise<UserCode | null> {
    const { data: existingCode, error } = await supabase
      .from('user_codes')
      .select('*')
      .eq('code', code)
      .eq('country_code', countryCode)
      .maybeSingle();

    if (error) throw error;

    if (!existingCode) {
      return null;
    }

    if (!existingCode.is_active) {
      throw new Error('CODE_INACTIVE');
    }

    if (existingCode.is_activated) {
      throw new Error('CODE_ALREADY_ACTIVATED');
    }

    return existingCode;
  }

  static async activateAccount(
    userCodeId: string,
    email: string,
    password: string
  ): Promise<{ user: AuthUser; error: string | null }> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      });

      if (authError) {
        return { user: null as unknown as AuthUser, error: authError.message };
      }

      if (!authData.user) {
        return { user: null as unknown as AuthUser, error: 'User creation failed' };
      }

      const { data: userCodeData } = await supabase
        .from('user_codes')
        .select('*')
        .eq('id', userCodeId)
        .single();

      if (!userCodeData) {
        return { user: null as unknown as AuthUser, error: 'User code not found' };
      }

      const { error: userError } = await supabase.from('users').insert({
        id: authData.user.id,
        user_code_id: userCodeId,
        email,
        country_code: userCodeData.country_code,
        preferred_language: i18n.language || 'fr'
      });

      if (userError) {
        return { user: null as unknown as AuthUser, error: userError.message };
      }

      const { error: activateError } = await supabase
        .from('user_codes')
        .update({
          is_activated: true,
          activated_at: new Date().toISOString()
        })
        .eq('id', userCodeId);

      if (activateError) {
        console.error('Error activating user code:', activateError);
      }

      const user = await this.getCurrentUser();
      return { user: user!, error: null };
    } catch (error) {
      return {
        user: null as unknown as AuthUser,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        const { data: failedUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (failedUser) {
          await this.logConnection(failedUser.id, 'failed_login');
        }

        return { user: null, error: authError.message };
      }

      const user = await this.getCurrentUser();

      if (user && authData.user) {
        await this.logConnection(authData.user.id, 'login');
      }

      return { user, error: null };
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async signOut(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await this.logConnection(user.id, 'logout');
    }

    await supabase.auth.signOut();
  }

  static async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) return null;

    const { data: userData } = await supabase
      .from('users')
      .select(`
        *,
        user_code:user_codes(*),
        country:countries!users_country_code_fkey(proof_photo_required)
      `)
      .eq('id', authUser.id)
      .maybeSingle();

    if (!userData) return null;

    const metadata = (userData.metadata || {}) as Record<string, string>;
    const firstName = userData.user_code?.first_name || metadata.first_name || '';
    const lastName = userData.user_code?.last_name || metadata.last_name || '';

    return {
      id: userData.id,
      email: userData.email,
      user_code_id: userData.user_code_id || '',
      country_code: userData.country_code,
      preferred_language: userData.preferred_language,
      role: userData.role,
      first_name: firstName,
      last_name: lastName,
      proof_photo_required: userData.country?.proof_photo_required ?? true
    };
  }

  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        this.getCurrentUser().then(callback).catch(() => callback(null));
      } else {
        callback(null);
      }
    });
  }
}
