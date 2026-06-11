import { useEffect, useState } from 'react';
import { Download, Upload, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, FileText, ChevronDown, Send, Timer, User, CalendarClock, AlertTriangle } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { Toast } from '../../components/ui/Toast';
import { SFTPService, type SFTPConfig, type SyncOperation, type ScheduleAlert } from '../../services/sftp.service';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ExportStats {
  countryCode: string;
  countryName: string;
  pendingReports: number;
  unsentSftpFiles: number;
}

type ExportMode = 'full' | 'generate_only' | 'sftp_only';
type TriggerFilter = 'all' | 'manual' | 'schedule' | 'retry';

const COUNTRIES_MAP: Record<string, string> = {
  FR: 'France', ES: 'Espagne', IT: 'Italie', BE: 'Belgique', CH: 'Suisse',
};

function ScheduleStatusBanner({ configs, alerts }: { configs: SFTPConfig[]; alerts: ScheduleAlert[] }) {
  const scheduledConfigs = configs.filter(c => c.schedule_enabled);

  if (scheduledConfigs.length === 0) return null;

  return (
    <div className="space-y-2">
      {scheduledConfigs.map((config) => {
        const configAlerts = alerts.filter(a => {
          if (a.sftp_config_id !== config.id) return false;
          if (config.last_scheduled_run_at && new Date(a.created_at) < new Date(config.last_scheduled_run_at)) return false;
          return true;
        });
        const hasRecentAlert = configAlerts.length > 0;
        const lastAlert = configAlerts[0];

        let statusColor = 'bg-green-500';
        let statusLabel = 'OK';
        let borderColor = 'border-green-200';
        let bgColor = 'bg-green-50';

        if (hasRecentAlert) {
          statusColor = 'bg-red-500';
          statusLabel = 'Alerte';
          borderColor = 'border-red-200';
          bgColor = 'bg-red-50';
        }

        const sortedTimes = [...(config.schedule_times || [])].sort();

        return (
          <div
            key={config.id}
            className={`flex items-center gap-4 p-3 rounded-lg border ${borderColor} ${bgColor}`}
          >
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusColor}`} />

            <div className="flex-1 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
              <span className="font-medium text-slate-900">
                {COUNTRIES_MAP[config.country_code] || config.country_code}
              </span>

              <span className="text-slate-600">
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                {sortedTimes.join(', ')}
              </span>

              {config.last_scheduled_run_at && (
                <span className="text-slate-500">
                  Derniere : {format(new Date(config.last_scheduled_run_at), 'Pp', { locale: fr })}
                </span>
              )}

              {hasRecentAlert && lastAlert && (
                <span className="flex items-center gap-1 text-red-700 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Alerte le {format(new Date(lastAlert.created_at), 'Pp', { locale: fr })}
                </span>
              )}
            </div>

            <Badge variant={hasRecentAlert ? 'danger' : 'success'}>{statusLabel}</Badge>
          </div>
        );
      })}
    </div>
  );
}

function TriggerBadge({ operation }: { operation: SyncOperation }) {
  const triggeredBy = operation.triggered_by || 'manual';

  switch (triggeredBy) {
    case 'schedule':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200">
          <Timer className="w-3 h-3" />
          Auto
        </span>
      );
    case 'retry':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <RefreshCw className="w-3 h-3" />
          Retry {operation.retry_count}/5
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
          <User className="w-3 h-3" />
          Manuel
        </span>
      );
  }
}

export function SFTPOperations() {
  const [configs, setConfigs] = useState<SFTPConfig[]>([]);
  const [operations, setOperations] = useState<SyncOperation[]>([]);
  const [exportStats, setExportStats] = useState<ExportStats[]>([]);
  const [scheduleAlerts, setScheduleAlerts] = useState<ScheduleAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [ipToast, setIpToast] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [triggerFilter, setTriggerFilter] = useState<TriggerFilter>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!openDropdown) return;
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [configsData, operationsData] = await Promise.all([
        SFTPService.getAllConfigurations(),
        SFTPService.getSyncOperations(50),
      ]);
      const activeConfigs = configsData.filter(c => c.active);
      setConfigs(activeConfigs);

      let alertsData: ScheduleAlert[] = [];
      try {
        alertsData = await SFTPService.getScheduleAlerts(undefined, 20);
      } catch {
        // alerts table may not be accessible for non-super-admins
      }
      setScheduleAlerts(alertsData);

      const { data: csvExports } = await supabase
        .from('sftp_file_logs')
        .select('*')
        .eq('operation_type', 'export')
        .eq('file_type', 'sales_csv')
        .order('created_at', { ascending: false })
        .limit(25);

      const mergedOperations = [
        ...operationsData,
        ...(csvExports || []).map(exp => ({
          id: exp.id,
          operation_type: 'export_csv' as const,
          status: exp.status as 'completed' | 'failed' | 'running',
          started_at: exp.created_at,
          completed_at: exp.created_at,
          files_processed: exp.status === 'success' ? 1 : 0,
          files_failed: exp.status === 'failed' ? 1 : 0,
          error_message: exp.error_message,
          details: {
            message: exp.filename,
            records: exp.records_processed,
          },
          sftp_config_id: '',
          created_by: exp.created_by,
          triggered_by: 'manual' as const,
          retry_count: 0,
          parent_operation_id: null,
          country_code: undefined,
        }))
      ].sort((a, b) => new Date(b.started_at || b.created_at).getTime() - new Date(a.started_at || a.created_at).getTime())
        .slice(0, 50);

      setOperations(mergedOperations);

      await loadExportStats(activeConfigs);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExportStats = async (activeConfigs: SFTPConfig[]) => {
    try {
      const statsPromises = activeConfigs.map(async (config) => {
        const { data: country } = await supabase
          .from('countries')
          .select('code, name')
          .eq('code', config.country_code)
          .maybeSingle();

        const { count } = await supabase
          .from('sales_reports')
          .select('*', { count: 'exact', head: true })
          .eq('country_code', config.country_code)
          .eq('status', 'validated')
          .eq('exported', false);

        const { count: unsentCount } = await supabase
          .from('sftp_file_logs')
          .select('*', { count: 'exact', head: true })
          .eq('operation_type', 'export')
          .eq('file_type', 'sales_csv')
          .eq('status', 'success')
          .eq('sftp_sent', false);

        return {
          countryCode: config.country_code,
          countryName: country?.name || config.country_code,
          pendingReports: count || 0,
          unsentSftpFiles: unsentCount || 0,
        };
      });

      const statsData = await Promise.all(statsPromises);
      setExportStats(statsData);
    } catch (error) {
      console.error('Error loading export stats:', error);
    }
  };

  const handleImport = async (configId: string) => {
    setOperationLoading(configId);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const ipResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-outbound-ip`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
          }
        );
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          if (ipData.outbound_ip) {
            setIpToast(ipData.outbound_ip);
          }
        }
      }
    } catch {
    }

    try {
      const result = await SFTPService.importFromSFTP(configId);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        await loadData();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      console.error('Error importing:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'import' });
    } finally {
      setOperationLoading(null);
    }
  };

  const handleExport = async (countryCode: string, mode: ExportMode) => {
    setExportLoading(`${countryCode}-${mode}`);
    setOpenDropdown(null);
    setMessage(null);

    try {
      let session = null;
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshData.session) {
        session = refreshData.session;
      } else {
        const { data: sessionData } = await supabase.auth.getSession();
        session = sessionData.session;
      }
      if (!session) {
        throw new Error('Session expiree, veuillez vous reconnecter');
      }

      const body: Record<string, string> = { countryCode, mode };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-sales`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Export failed');
      }

      setMessage({ type: 'success', text: result.message });
      await loadData();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erreur lors de l\'export',
      });
    } finally {
      setExportLoading(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-brand-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Termine</Badge>;
      case 'failed':
        return <Badge variant="danger">Echoue</Badge>;
      case 'running':
        return <Badge variant="warning">En cours</Badge>;
      default:
        return <Badge>En attente</Badge>;
    }
  };

  const filteredOperations = operations.filter((op) => {
    if (triggerFilter === 'all') return true;
    const trigger = op.triggered_by || 'manual';
    return trigger === triggerFilter;
  });

  if (loading) {
    return (
      <MainLayout>
        <Loading />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {ipToast && (
        <Toast
          message={`Adresse IP sortante du serveur : ${ipToast}`}
          type="info"
          duration={0}
          onClose={() => setIpToast(null)}
        />
      )}
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operations SFTP</h1>
          <p className="text-slate-600 mt-1">Gerez l'import et l'export des fichiers via SFTP</p>
        </div>

        <ScheduleStatusBanner configs={configs} alerts={scheduleAlerts} />

        {message && (
          <div
            className={`p-4 rounded-lg border ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <div className="flex items-start gap-3">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Configurations SFTP actives</CardTitle>
          </CardHeader>
          <CardContent>
            {configs.length === 0 ? (
              <EmptyState
                icon={<AlertCircle className="w-12 h-12" />}
                title="Aucune configuration"
                description="Creez une configuration SFTP pour commencer"
              />
            ) : (
              <div className="space-y-4">
                {configs.map((config) => {
                  const countryStats = exportStats.find(s => s.countryCode === config.country_code);
                  const isAnyLoading = exportLoading?.startsWith(config.country_code);

                  return (
                    <div
                      key={config.id}
                      className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge>{config.country_code}</Badge>
                            <h3 className="font-semibold text-slate-900">
                              {config.host}:{config.port}
                            </h3>
                            {config.schedule_enabled && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200">
                                <CalendarClock className="w-3 h-3" />
                                Auto : {(config.schedule_times || []).join(', ')}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">
                            Utilisateur: {config.username}
                          </p>
                          <div className="flex gap-4 mt-2 text-sm text-slate-500">
                            <span>Import: {config.import_path}</span>
                            <span>Export: {config.export_path}</span>
                          </div>
                          {config.last_sync_at && (
                            <p className="text-xs text-slate-500 mt-1">
                              Derniere sync: {format(new Date(config.last_sync_at), 'Pp', { locale: fr })}
                            </p>
                          )}
                          {countryStats && countryStats.pendingReports > 0 && (
                            <div className="mt-3 p-2 bg-brand-50 border border-brand-200 rounded-lg">
                              <p className="text-sm text-brand-700 font-medium">
                                <FileText className="w-4 h-4 inline mr-1" />
                                {countryStats.pendingReports} CR valide{countryStats.pendingReports > 1 ? 's' : ''} a exporter
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleImport(config.id)}
                            disabled={!!operationLoading || !!isAnyLoading}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Importer
                          </Button>

                          {countryStats && (
                            <div className="relative flex rounded-lg overflow-visible border border-slate-200 shadow-sm">
                              <button
                                onClick={() => handleExport(config.country_code, 'full')}
                                disabled={countryStats.pendingReports === 0 || !!isAnyLoading}
                                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-l-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                                  ${countryStats.pendingReports > 0
                                    ? 'bg-brand-600 hover:bg-brand-700 text-white'
                                    : 'bg-slate-100 text-slate-500'
                                  }`}
                              >
                                {exportLoading === `${config.country_code}-full` ? (
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Upload className="w-3.5 h-3.5" />
                                )}
                                CSV + SFTP
                              </button>
                              <button
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={() => setOpenDropdown(openDropdown === config.id ? null : config.id)}
                                disabled={!!isAnyLoading}
                                className={`px-2 py-1.5 rounded-r-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                                  ${countryStats.pendingReports > 0
                                    ? 'bg-brand-600 hover:bg-brand-700 text-white border-l border-brand-500'
                                    : 'bg-slate-100 text-slate-500 border-l border-slate-200'
                                  }`}
                                aria-label="Plus d'options d'export"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>

                              {openDropdown === config.id && (
                                <div
                                  onMouseDown={(e) => e.stopPropagation()}
                                  className="absolute top-full mt-1 right-0 z-30 min-w-[230px] bg-white rounded-lg shadow-xl border border-slate-200 py-1"
                                >
                                  <button
                                    onClick={() => handleExport(config.country_code, 'generate_only')}
                                    disabled={countryStats.pendingReports === 0}
                                    className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <FileText className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-sm font-medium text-slate-900">CSV uniquement</p>
                                      <p className="text-xs text-slate-500">Genere le fichier sans l'envoyer</p>
                                    </div>
                                  </button>
                                  <div className="border-t border-slate-100 my-1" />
                                  <button
                                    onClick={() => handleExport(config.country_code, 'sftp_only')}
                                    disabled={countryStats.unsentSftpFiles === 0}
                                    className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <Send className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-sm font-medium text-slate-900">SFTP uniquement</p>
                                      <p className="text-xs text-slate-500 truncate max-w-[170px]">
                                        {countryStats.unsentSftpFiles > 0
                                          ? `${countryStats.unsentSftpFiles} fichier(s) en attente`
                                          : 'Aucun fichier en attente'}
                                      </p>
                                    </div>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Format du fichier CSV d'export</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Les fichiers CSV sont generes avec le format suivant :
              </p>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <code className="text-xs font-mono text-slate-900 block whitespace-pre">
                  id;user_id;event_id;product_id;quantity;ca_tickets;comment;image
                </code>
              </div>
              <div className="text-sm text-slate-600 space-y-1">
                <p><strong>id:</strong> ID de la ligne du CR</p>
                <p><strong>user_id:</strong> Code utilisateur de l'animateur</p>
                <p><strong>event_id:</strong> ID externe du rendez-vous</p>
                <p><strong>product_id:</strong> Code du produit</p>
                <p><strong>quantity:</strong> Quantite vendue</p>
                <p><strong>ca_tickets:</strong> Montant de la ligne</p>
                <p><strong>comment:</strong> Commentaire du CR</p>
                <p><strong>image:</strong> Nom du fichier justificatif</p>
              </div>
              <div className="mt-4 p-3 bg-brand-50 border border-brand-200 rounded-lg">
                <p className="text-sm text-brand-700">
                  <FileText className="w-4 h-4 inline mr-2" />
                  Les fichiers exportes sont visibles dans l'onglet <strong>Historique fichier</strong> avec un bouton de telechargement
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Historique des operations</CardTitle>
              <div className="flex gap-1">
                {(['all', 'manual', 'schedule', 'retry'] as TriggerFilter[]).map((filter) => {
                  const labels: Record<TriggerFilter, string> = {
                    all: 'Toutes',
                    manual: 'Manuelles',
                    schedule: 'Automatiques',
                    retry: 'Retries',
                  };
                  return (
                    <button
                      key={filter}
                      onClick={() => setTriggerFilter(filter)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        triggerFilter === filter
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {labels[filter]}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredOperations.length === 0 ? (
              <EmptyState
                icon={<Clock className="w-12 h-12" />}
                title="Aucune operation"
                description="Les operations d'import/export apparaitront ici"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Pays</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Origine</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Statut</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Demarre</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Termine</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Fichiers</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOperations.map((operation) => (
                      <tr key={operation.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {operation.operation_type === 'import' ? (
                              <Download className="w-4 h-4 text-brand-600" />
                            ) : operation.operation_type === 'export_csv' ? (
                              <FileText className="w-4 h-4 text-green-600" />
                            ) : (
                              <Upload className="w-4 h-4 text-green-600" />
                            )}
                            <span className="capitalize">
                              {operation.operation_type === 'export_csv' ? 'Export CSV' : operation.operation_type}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {operation.country_code ? (
                            <Badge>{operation.country_code}</Badge>
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <TriggerBadge operation={operation} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(operation.status)}
                            {getStatusBadge(operation.status)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {operation.started_at
                            ? format(new Date(operation.started_at), 'Pp', { locale: fr })
                            : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {operation.completed_at
                            ? format(new Date(operation.completed_at), 'Pp', { locale: fr })
                            : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <div className="text-green-600">{operation.files_processed} traite(s)</div>
                            {operation.files_failed > 0 && (
                              <div className="text-red-600">{operation.files_failed} echec(s)</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 max-w-xs truncate">
                          {operation.error_message && (
                            <span className="text-red-600">{operation.error_message}</span>
                          )}
                          {operation.details?.message && (
                            <span className="text-slate-500">{operation.details.message}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
