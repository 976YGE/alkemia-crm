import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Download, Send } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { Toast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { FreelanceService } from '../../services/freelance.service';
import type { FreelancePeriodicDocument } from '../../types/database';

const DOCUMENT_LABELS: Record<string, string> = {
  urssaf_vigilance: 'Attestation URSSAF',
  fiscal_regularity: 'Attestation fiscale',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'error'; icon: typeof CheckCircle }> = {
  valid: { label: 'Valide', variant: 'success', icon: CheckCircle },
  expiring_soon: { label: 'Expire bientôt', variant: 'warning', icon: AlertTriangle },
  expired: { label: 'Expiré', variant: 'error', icon: XCircle },
};

interface DocWithRegistration extends FreelancePeriodicDocument {
  registration?: { first_name: string; last_name: string; email: string } | null;
}

export function PeriodicDocuments() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocWithRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await FreelanceService.getAllPeriodicDocuments();
      setDocuments(data as DocWithRegistration[]);
    } catch (err) {
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (doc: DocWithRegistration) => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-freelance-notification`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'periodic_document_reminder', documentId: doc.id }),
      });

      if (!response.ok) throw new Error('Erreur lors de l\'envoi');
      setSuccess('Rappel envoyé avec succès');
      await loadDocuments();
    } catch {
      setError('Erreur lors de l\'envoi du rappel');
    }
  };

  const handleDownload = async (filePath: string) => {
    try {
      const url = await FreelanceService.getDocumentUrl(filePath);
      window.open(url, '_blank');
    } catch {
      setError('Erreur lors du téléchargement');
    }
  };

  if (user?.role !== 'hr_manager' && user?.role !== 'super_admin') {
    return (
      <MainLayout>
        <div className="text-center py-12"><p className="text-slate-600">Accès non autorisé</p></div>
      </MainLayout>
    );
  }

  const filtered = statusFilter === 'all' ? documents : documents.filter(d => d.status === statusFilter);
  const expiredCount = documents.filter(d => d.status === 'expired').length;
  const expiringCount = documents.filter(d => d.status === 'expiring_soon').length;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Documents périodiques</h1>
            <p className="text-sm text-slate-500 mt-1">
              Suivi des attestations à renouveler des animateurs non salariés
            </p>
          </div>
          <div className="flex items-center gap-3">
            {expiredCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-700">{expiredCount} expiré{expiredCount > 1 ? 's' : ''}</span>
              </div>
            )}
            {expiringCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-700">{expiringCount} bientôt</span>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { value: 'all', label: 'Tous' },
            { value: 'expired', label: 'Expirés' },
            { value: 'expiring_soon', label: 'Expire bientôt' },
            { value: 'valid', label: 'Valides' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === f.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <Loading text={t('common.loading')} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<RefreshCw className="w-16 h-16" />}
            title="Aucun document"
            description="Aucun document périodique pour ce filtre."
          />
        ) : (
          <div className="space-y-3">
            {filtered.map(doc => {
              const config = STATUS_CONFIG[doc.status];
              const StatusIcon = config.icon;
              const daysUntilExpiry = Math.ceil((new Date(doc.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

              return (
                <Card key={doc.id} padding={false} className="rounded-xl">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {doc.registration ? `${doc.registration.first_name} ${doc.registration.last_name}` : 'Animateur'}
                        </h3>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{DOCUMENT_LABELS[doc.document_type]}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Expire le {new Date(doc.expires_at).toLocaleDateString('fr-FR')}
                        {daysUntilExpiry > 0 ? ` (dans ${daysUntilExpiry} jour${daysUntilExpiry > 1 ? 's' : ''})` : ' (expiré)'}
                        {doc.reminder_sent_at && ` - Rappel envoyé le ${new Date(doc.reminder_sent_at).toLocaleDateString('fr-FR')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleDownload(doc.file_path)}
                        className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title="Télécharger"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {(doc.status === 'expiring_soon' || doc.status === 'expired') && (
                        <button
                          onClick={() => handleSendReminder(doc)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Envoyer un rappel"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </MainLayout>
  );
}
