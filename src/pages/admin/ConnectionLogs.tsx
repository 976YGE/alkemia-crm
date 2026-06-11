import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Calendar, User, LogIn, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { supabase } from '../../lib/supabase';

interface ConnectionLog {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  action: 'login' | 'logout' | 'failed_login';
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const PAGE_SIZE = 50;

function parseUserAgent(ua: string | null): string {
  if (!ua) return '—';
  let browser = 'Navigateur inconnu';
  let os = '';

  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/') || ua.includes('Edge/')) browser = 'Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';

  if (ua.includes('Windows NT')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return os ? `${browser} / ${os}` : browser;
}

export function ConnectionLogs() {
  const [logs, setLogs] = useState<ConnectionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const loadLogs = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('connection_logs')
        .select(`
          id,
          user_id,
          action,
          ip_address,
          user_agent,
          created_at,
          users!inner(
            email,
            user_codes(first_name, last_name)
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filterAction !== 'all') {
        query = query.eq('action', filterAction);
      }

      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString());
      }

      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query = query.lte('created_at', end.toISOString());
      }

      if (searchQuery.trim()) {
        query = query.or(
          `ip_address.ilike.%${searchQuery}%,users.email.ilike.%${searchQuery}%`
        );
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const formattedLogs = (data ?? []).map((log: any) => {
        const userCode = log.users?.user_codes;
        const firstName = userCode?.first_name || '';
        const lastName = userCode?.last_name || '';
        return {
          id: log.id,
          user_id: log.user_id,
          user_email: log.users?.email || '—',
          user_name: (firstName || lastName) ? `${firstName} ${lastName}`.trim() : log.users?.email || '—',
          action: log.action,
          ip_address: log.ip_address,
          user_agent: log.user_agent,
          created_at: log.created_at
        };
      });

      setLogs(formattedLogs);
      setTotalCount(count ?? 0);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterAction, dateFrom, dateTo]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterAction, dateFrom, dateTo]);

  useEffect(() => {
    loadLogs(currentPage);
  }, [currentPage, loadLogs]);

  const handleExport = async () => {
    try {
      let query = supabase
        .from('connection_logs')
        .select(`
          id,
          user_id,
          action,
          ip_address,
          user_agent,
          created_at,
          users!inner(
            email,
            user_codes(first_name, last_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (filterAction !== 'all') {
        query = query.eq('action', filterAction);
      }

      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString());
      }

      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query = query.lte('created_at', end.toISOString());
      }

      if (searchQuery.trim()) {
        query = query.or(
          `ip_address.ilike.%${searchQuery}%,users.email.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data ?? []).map((log: any) => {
        const userCode = log.users?.user_codes;
        const name = [userCode?.first_name, userCode?.last_name].filter(Boolean).join(' ') || log.users?.email || '';
        return [
          new Date(log.created_at).toLocaleString('fr-FR'),
          name,
          log.users?.email || '',
          log.action,
          log.ip_address ?? '',
          parseUserAgent(log.user_agent)
        ];
      });

      const header = ['Date', 'Utilisateur', 'Email', 'Action', 'IP', 'Navigateur'];
      const csv = [header, ...rows]
        .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-connexion-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'login':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 inline-flex items-center">
            <LogIn className="w-3 h-3 mr-1" />
            Connexion
          </Badge>
        );
      case 'logout':
        return (
          <Badge variant="default" className="bg-brand-100 text-brand-800 inline-flex items-center">
            <LogOut className="w-3 h-3 mr-1" />
            Déconnexion
          </Badge>
        );
      case 'failed_login':
        return <Badge variant="destructive">Échec</Badge>;
      default:
        return <Badge variant="default">{action}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Logs de connexion</h1>
            <p className="text-slate-600 mt-1">
              {totalCount} entrée{totalCount !== 1 ? 's' : ''} au total
            </p>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>

        <Card>
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-48 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Rechercher par utilisateur ou IP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">Toutes les actions</option>
                <option value="login">Connexions</option>
                <option value="logout">Déconnexions</option>
                <option value="failed_login">Échecs</option>
              </select>
            </div>
            <div className="flex gap-4 flex-wrap items-center">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Du</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <span>au</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => { setDateFrom(''); setDateTo(''); }}
                    className="text-xs text-slate-500 hover:text-slate-700 underline"
                  >
                    Effacer
                  </button>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-12">
              <Loading />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Date & Heure
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Utilisateur
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Adresse IP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Navigateur
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-slate-900">
                            <Calendar className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0" />
                            {new Date(log.created_at).toLocaleString('fr-FR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0" />
                            <div>
                              <div className="text-sm font-medium text-slate-900">{log.user_name}</div>
                              <div className="text-sm text-slate-500">{log.user_email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getActionBadge(log.action)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono text-slate-900">
                            {log.ip_address ?? '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="text-sm text-slate-600 cursor-default"
                            title={log.user_agent ?? ''}
                          >
                            {parseUserAgent(log.user_agent)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {logs.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-500">Aucun log trouvé</p>
                </div>
              )}

              {totalCount > 0 && (
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    Page {currentPage} sur {totalPages} — {totalCount} entrée{totalCount !== 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Suivant
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
