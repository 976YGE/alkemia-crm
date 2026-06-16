import { supabase } from '../lib/supabase';

export type UserRole = 'animator' | 'hr_manager' | 'admin' | 'super_admin';

export interface CreateUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  countryCode: string;
  language?: string;
  userCodeId?: string | null;
}

export interface CreateUserResult {
  success: boolean;
  message: string;
  userId?: string;
}

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;

async function callFunction(body: Record<string, unknown>): Promise<CreateUserResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { success: false, message: 'Session expirée, reconnectez-vous' };
  }

  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...body,
      redirectTo: `${window.location.origin}/welcome`,
    }),
  });

  try {
    const data = (await response.json()) as CreateUserResult;
    return data;
  } catch {
    return { success: false, message: `Erreur HTTP ${response.status}` };
  }
}

export const AdminUsersService = {
  async createUser(payload: CreateUserPayload): Promise<CreateUserResult> {
    return callFunction({
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role,
      countryCode: payload.countryCode,
      language: payload.language,
      userCodeId: payload.userCodeId ?? null,
    });
  },

  async resendInvite(userId: string): Promise<CreateUserResult> {
    return callFunction({ resendInviteUserId: userId });
  },
};
