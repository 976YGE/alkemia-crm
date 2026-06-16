import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, CheckCircle, XCircle, KeyRound, Clock, UserX, UserCheck, ShieldCheck, ShieldOff, UserPlus, Send } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { Toast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';
import { AdminUsersService } from '../../services/admin-users.service';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserWithCode {
  code_id: string;
  user_code: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_activated: boolean;
  user_id?: string | null;
  email?: string | null;
  country_code?: string | null;
  preferred_language?: string | null;
  role?: string | null;
  created_at?: string | null;
  last_login?: string | null;
  has_logged_in: boolean;
  code_never_used: boolean;
}

type FilterType = 'all' | 'connected' | 'never_connected' | 'code_never_used' | 'inactive_crm';

export function UserManagement() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: codesData, error: codesError } = await supabase
        .from('user_codes')
        .select('id, code, first_name, last_name, is_active, is_activated, country_code, created_at')
        .order('created_at', { ascending: false });

      if (codesError) throw codesError;

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, user_code_id, country_code, preferred_language, role, created_at');

      if (usersError) throw usersError;

      const usersMap = new Map(usersData?.map(u => [u.user_code_id, u]) || []);
      const userIds = usersData?.map(u => u.id) || [];

      let authMap = new Map();
      if (userIds.length > 0) {
        const { data: authData } = await supabase.rpc('get_auth_users_info', { user_ids: userIds });
        authMap = new Map(authData?.map((a: any) => [a.id, a]) || []);
      }

      let lastLogins = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: logsData } = await supabase
          .from('connection_logs')
          .select('user_id, created_at')
          .in('user_id', userIds)
          .eq('action', 'login')
          .order('created_at', { ascending: false });

        logsData?.forEach(log => {
          if (!lastLogins.has(log.user_id)) {
            lastLogins.set(log.user_id, log.created_at);
          }
        });
      }

      const formattedUsers = codesData.map(code => {
        const user = usersMap.get(code.id);
        const authUser = user ? authMap.get(user.id) : null;
        const lastLogin = user ? (lastLogins.get(user.id) || authUser?.last_sign_in_at) : null;

        return {
          code_id: code.id,
          user_code: code.code,
          first_name: code.first_name,
          last_name: code.last_name,
          is_active: code.is_active,
          is_activated: code.is_activated,
          user_id: user?.id || null,
          email: user?.email || null,
          country_code: code.country_code || user?.country_code || null,
          preferred_language: user?.preferred_language || null,
          role: user?.role || null,
          created_at: user?.created_at || code.created_at,
          last_login: lastLogin,
          has_logged_in: !!lastLogin,
          code_never_used: !user,
        };
      });

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCrmActive = async (codeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_codes')
        .update({ is_active: !currentStatus })
        .eq('id', codeId);

      if (error) throw error;
      await loadUsers();
    } catch (error) {
      console.error('Error toggling CRM status:', error);
    }
  };

  const resetPassword = async (userId: string, email: string) => {
    if (!confirm(`Envoyer un email de réinitialisation de mot de passe à ${email} ?`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { alert('Session expirée'); return; }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();
      alert(result.success ? `✓ ${result.message}` : `✗ ${result.message}`);
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Erreur lors de la réinitialisation du mot de passe');
    }
  };

  const resendInvite = async (userId: string, email: string) => {
    if (!confirm(`Renvoyer une invitation à ${email} ?`)) return;
    setActioningId(userId);
    try {
      const result = await AdminUsersService.resendInvite(userId);
      setToast({ message: result.message, type: result.success ? 'success' : 'error' });
    } catch (error) {
      console.error('Error resending invite:', error);
      setToast({ message: 'Erreur lors de l\'envoi', type: 'error' });
    } finally {
      setActioningId(null);
    }
  };

  const availableCountries = Array.from(new Set(users.map(u => u.country_code).filter(Boolean))).sort() as string[];

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.user_code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filter === 'all' ? true :
      filter === 'connected' ? user.has_logged_in && !user.code_never_used :
      filter === 'never_connected' ? !user.has_logged_in && !user.code_never_used :
      filter === 'code_never_used' ? user.code_never_used :
      filter === 'inactive_crm' ? !user.is_active :
      true;

    const matchesCountry = countryFilter === 'all' || user.country_code === countryFilter;

    return matchesSearch && matchesFilter && matchesCountry;
  });

  const connectedCount = users.filter(u => u.has_logged_in && !u.code_never_used).length;
  const neverConnectedCount = users.filter(u => !u.has_logged_in && !u.code_never_used).length;
  const codeNeverUsedCount = users.filter(u => u.code_never_used).length;
  const inactiveCrmCount = users.filter(u => !u.is_active).length;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin': return <Badge variant="destructive">Super Admin</Badge>;
      case 'admin': return <Badge variant="default">Admin</Badge>;
      default: return <Badge variant="default">{role}</Badge>;
    }
  };

  if (loading) {
    return <MainLayout><Loading /></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestion des utilisateurs</h1>
            <p className="text-slate-600 mt-1">{users.length} utilisateur{users.length > 1 ? 's' : ''} au total</p>
          </div>
          <Button onClick={() => navigate('/admin/users/new')}>
            <UserPlus className="w-4 h-4 mr-2" />
            Nouvel utilisateur
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{users.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Connectés</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{connectedCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Non activés</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{codeNeverUsedCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Inactifs CRM</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{inactiveCrmCount}</p>
          </div>
        </div>

        <Card>
          <div className="p-4 border-b border-slate-200 space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button variant={filter === 'all' ? 'default' : 'secondary'} size="sm" onClick={() => setFilter('all')}>
                Tous ({users.length})
              </Button>
              <Button variant={filter === 'connected' ? 'default' : 'secondary'} size="sm" onClick={() => setFilter('connected')}>
                <CheckCircle className="w-4 h-4 mr-1" />
                Connectés ({connectedCount})
              </Button>
              <Button variant={filter === 'never_connected' ? 'default' : 'secondary'} size="sm" onClick={() => setFilter('never_connected')}>
                <XCircle className="w-4 h-4 mr-1" />
                Jamais connectés ({neverConnectedCount})
              </Button>
              <Button variant={filter === 'code_never_used' ? 'default' : 'secondary'} size="sm" onClick={() => setFilter('code_never_used')}>
                <Clock className="w-4 h-4 mr-1" />
                Codes non utilisés ({codeNeverUsedCount})
              </Button>
              <Button variant={filter === 'inactive_crm' ? 'default' : 'secondary'} size="sm" onClick={() => setFilter('inactive_crm')}>
                <UserX className="w-4 h-4 mr-1" />
                Inactifs CRM ({inactiveCrmCount})
              </Button>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Rechercher un utilisateur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {availableCountries.length > 1 && (
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                >
                  <option value="all">Tous les pays</option>
                  {availableCountries.map(c => (
                    <option key={c} value={c}>{c.toUpperCase()}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Utilisateur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Pays</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rôle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <div className="flex flex-col gap-0.5">
                      <span>Statut CRM</span>
                      <span className="text-slate-400 font-normal normal-case">Actif dans le CRM</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <div className="flex flex-col gap-0.5">
                      <span>Compte Alkemia</span>
                      <span className="text-slate-400 font-normal normal-case">Activé sur l'app</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Dernière connexion</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.code_id} className={`hover:bg-slate-50 ${!user.is_active ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{user.first_name} {user.last_name}</div>
                        <div className="text-sm text-slate-500">
                          {user.email || <span className="italic text-slate-400">Compte non créé</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-slate-900">{user.user_code}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.country_code ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 uppercase tracking-wider">
                          {user.country_code}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.role ? getRoleBadge(user.role) : <span className="text-sm text-slate-400">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_active ? (
                        <div className="flex items-center gap-1.5 text-green-700">
                          <ShieldCheck className="w-4 h-4" />
                          <span className="text-sm font-medium">Actif</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-red-600">
                          <ShieldOff className="w-4 h-4" />
                          <span className="text-sm font-medium">Inactif</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.code_never_used ? (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <UserX className="w-4 h-4" />
                          <span className="text-sm">Non créé</span>
                        </div>
                      ) : user.is_activated ? (
                        <div className="flex items-center gap-1.5 text-brand-700">
                          <UserCheck className="w-4 h-4" />
                          <span className="text-sm font-medium">Activé</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-amber-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium">En attente</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.code_never_used ? (
                        <span className="text-sm text-slate-400">-</span>
                      ) : user.has_logged_in ? (
                        <div className="text-sm text-slate-900">
                          {format(new Date(user.last_login!), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </div>
                      ) : (
                        <Badge variant="warning">Jamais connecté</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        {!user.code_never_used && !user.has_logged_in && user.email && (
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={actioningId === user.user_id}
                            onClick={() => resendInvite(user.user_id!, user.email!)}
                            title="Renvoyer l'invitation"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                        {!user.code_never_used && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resetPassword(user.user_id!, user.email!)}
                            title="Réinitialiser le mot de passe"
                          >
                            <KeyRound className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCrmActive(user.code_id, user.is_active)}
                          title={user.is_active ? 'Désactiver dans le CRM' : 'Activer dans le CRM'}
                        >
                          {user.is_active ? (
                            <span className="flex items-center gap-1 text-red-600"><ShieldOff className="w-4 h-4" /> Désactiver</span>
                          ) : (
                            <span className="flex items-center gap-1 text-green-700"><ShieldCheck className="w-4 h-4" /> Activer</span>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">Aucun utilisateur trouvé</p>
            </div>
          )}
        </Card>

        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-brand-800 mb-2">Légende des statuts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-brand-700">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
              <span><strong>Actif CRM</strong> : l'utilisateur est actif dans le CRM source (champ 1 du fichier SFTP). Il peut activer et utiliser son compte Alkemia.</span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldOff className="w-4 h-4 mt-0.5 text-red-600 shrink-0" />
              <span><strong>Inactif CRM</strong> : l'utilisateur est inactif dans le CRM (champ 0). Il ne peut pas se connecter ni activer son compte.</span>
            </div>
            <div className="flex items-start gap-2">
              <UserCheck className="w-4 h-4 mt-0.5 text-brand-600 shrink-0" />
              <span><strong>Compte Alkemia activé</strong> : l'utilisateur a créé son compte avec son code et peut se connecter.</span>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
              <span><strong>En attente</strong> : le compte Supabase existe mais l'utilisateur ne s'est pas encore connecté pour la première fois.</span>
            </div>
          </div>
        </div>
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type === 'success' ? 'success' : 'error'}
          onClose={() => setToast(null)}
        />
      )}
    </MainLayout>
  );
}
