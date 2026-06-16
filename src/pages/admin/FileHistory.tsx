import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, AlertCircle, CheckCircle, Clock, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { format } from 'date-fns';

interface FileLog {
  id: string;
  filename: string;
  operation_type: 'import' | 'export';
  file_type: string;
  status: 'success' | 'failed' | 'partial';
  records_processed: number;
  records_failed: number;
  error_message: string | null;
  processing_time_ms: number;
  file_size_bytes: number;
  created_at: string;
}

export default function FileHistory() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<FileLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'import' | 'export'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadLogs();
  }, [filter, statusFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('sftp_file_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.eq('operation_type', filter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading file logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" />Succès</Badge>;
      case 'failed':
        return <Badge variant="danger"><AlertCircle className="w-3 h-3 mr-1" />Échec</Badge>;
      case 'partial':
        return <Badge variant="warning"><AlertCircle className="w-3 h-3 mr-1" />Partiel</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getOperationBadge = (operation: string) => {
    return operation === 'import' ? (
      <Badge variant="info">Import</Badge>
    ) : (
      <Badge variant="default">Export</Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatProcessingTime = (ms: number) => {
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  const handleDownload = async (log: FileLog) => {
    if (log.operation_type !== 'export') return;

    setDownloadingFile(log.id);
    setMessage(null);

    try {
      const countryCode = log.filename.split('_')[2];
      const filePath = `${countryCode}/${log.filename}`;

      const { data, error } = await supabase.storage
        .from('sales-exports')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = log.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({
        type: 'success',
        text: `Fichier téléchargé : ${log.filename}`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erreur lors du téléchargement',
      });
    } finally {
      setDownloadingFile(null);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Loading />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Historique des fichiers</h1>
        <p className="text-slate-600 mt-2">
          Consultez l'historique de tous les fichiers synchronisés via SFTP
        </p>
      </div>

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
        <div className="flex gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Type d'opération
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">Tous</option>
              <option value="import">Import</option>
              <option value="export">Export</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Statut
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">Tous</option>
              <option value="success">Succès</option>
              <option value="failed">Échec</option>
            </select>
          </div>
        </div>

        {logs.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-12 h-12" />}
            title="Aucun historique"
            description="Aucun fichier n'a encore été synchronisé"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Fichier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Opération
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Enregistrements
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Taille
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Durée
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-slate-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {log.filename}
                          </div>
                          {log.error_message && (
                            <div className="text-xs text-red-600 mt-1">
                              {log.error_message}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getOperationBadge(log.operation_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-900">{log.file_type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">
                        {log.records_processed > 0 && (
                          <div className="text-green-600">
                            ✓ {log.records_processed}
                          </div>
                        )}
                        {log.records_failed > 0 && (
                          <div className="text-red-600">
                            ✗ {log.records_failed}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatFileSize(log.file_size_bytes)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatProcessingTime(log.processing_time_ms)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {log.operation_type === 'export' && log.status === 'success' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDownload(log)}
                          disabled={downloadingFile === log.id}
                        >
                          {downloadingFile === log.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin mr-2" />
                              Téléchargement...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Télécharger
                            </>
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
    </MainLayout>
  );
}
