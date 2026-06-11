import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { supabase } from '../../lib/supabase';
import type { ImportExportLog } from '../../types';

export function SyncMonitoring() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<ImportExportLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('import_export_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <Clock className="w-5 h-5 text-brand-600 animate-pulse" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="success">Success</Badge>;
      case 'error':
        return <Badge variant="danger">Error</Badge>;
      case 'running':
        return <Badge variant="info">Running</Badge>;
      default:
        return <Badge variant="default">Pending</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      import_users: 'Import Users',
      import_products: 'Import Products',
      import_appointments: 'Import Appointments',
      export_sales: 'Export Sales'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <MainLayout>
        <Loading text={t('common.loading')} />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Synchronization Monitoring</h1>
          <Button onClick={loadLogs} size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {logs.length === 0 ? (
          <EmptyState
            icon={<RefreshCw className="w-16 h-16" />}
            title="No synchronization logs"
            description="Synchronization logs will appear here once data is synced"
          />
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <Card key={log.id} padding={false}>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      {getStatusIcon(log.status)}
                      <div className="ml-3">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {getTypeLabel(log.type)}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {log.country_code} - {log.filename}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(log.status)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-sm text-slate-500">Processed</p>
                      <p className="text-lg font-semibold text-slate-900">{log.rows_processed}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Success</p>
                      <p className="text-lg font-semibold text-green-600">{log.rows_success}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Errors</p>
                      <p className="text-lg font-semibold text-red-600">{log.rows_error}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Date</p>
                      <p className="text-sm font-medium text-slate-900">
                        {log.created_at && format(parseISO(log.created_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                  </div>

                  {log.error_message && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">{log.error_message}</p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
