import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Upload, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { Toast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { FreelanceService } from '../../services/freelance.service';
import type { FreelancePeriodicDocument, PeriodicDocumentType } from '../../types/database';

const DOCUMENT_LABELS: Record<string, string> = {
  urssaf_vigilance: 'Attestation de vigilance URSSAF',
  fiscal_regularity: 'Attestation de régularité fiscale (SIE)',
};

const DOCUMENT_PERIODS: Record<string, string> = {
  urssaf_vigilance: 'Renouvellement tous les 6 mois',
  fiscal_regularity: 'Renouvellement annuel',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'error'; icon: typeof CheckCircle }> = {
  valid: { label: 'Valide', variant: 'success', icon: CheckCircle },
  expiring_soon: { label: 'Expire bientôt', variant: 'warning', icon: AlertTriangle },
  expired: { label: 'Expiré', variant: 'error', icon: XCircle },
};

export function MyDocuments() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<FreelancePeriodicDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (user) loadDocuments();
  }, [user]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await FreelanceService.getUserPeriodicDocuments(user!.id);
      setDocuments(data);
    } catch {
      setError('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (type: PeriodicDocumentType, file: File) => {
    if (!user) return;
    setUploading(type);
    setError('');
    try {
      await FreelanceService.uploadPeriodicDocument(user.id, type, file);
      setSuccess('Document mis à jour avec succès');
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setUploading(null);
    }
  };

  const getLatestDoc = (type: string): FreelancePeriodicDocument | undefined => {
    return documents
      .filter(d => d.document_type === type)
      .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())[0];
  };

  if (loading) {
    return <MainLayout><Loading text={t('common.loading')} /></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mes documents</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gérez vos attestations périodiques. Vous recevrez un rappel par email avant leur expiration.
          </p>
        </div>

        <div className="space-y-4">
          {(['urssaf_vigilance', 'fiscal_regularity'] as PeriodicDocumentType[]).map(type => {
            const doc = getLatestDoc(type);
            const config = doc ? STATUS_CONFIG[doc.status] : null;
            const StatusIcon = config?.icon || Clock;

            return (
              <Card key={type} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-semibold text-slate-900">{DOCUMENT_LABELS[type]}</h3>
                      {doc && config && <Badge variant={config.variant}>{config.label}</Badge>}
                    </div>
                    <p className="text-sm text-slate-500">{DOCUMENT_PERIODS[type]}</p>

                    {doc && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600">{doc.original_filename}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Téléversé le {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                          {' - '}Expire le {new Date(doc.expires_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRefs.current[type]?.click()}
                      loading={uploading === type}
                      disabled={uploading !== null}
                    >
                      <Upload className="w-4 h-4 mr-1.5" />
                      {doc ? 'Mettre à jour' : 'Téléverser'}
                    </Button>
                    <input
                      ref={el => { fileInputRefs.current[type] = el; }}
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(type, file);
                        e.target.value = '';
                      }}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </MainLayout>
  );
}
