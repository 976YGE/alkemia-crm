import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Download, User, Truck, Briefcase, FileText, Clock, AlertCircle, MessageSquare, Send } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { Toast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { FreelanceService } from '../../services/freelance.service';
import type { FreelanceRegistration, FreelanceDocument, FreelancePeriodicDocument, CountryCode, DocumentReviewStatus } from '../../types/database';

const DOCUMENT_LABELS: Record<string, string> = {
  rib: 'RIB',
  cv: 'CV',
  id_card_front: 'Pièce d\'identité (recto)',
  id_card_back: 'Pièce d\'identité (verso)',
  kbis_or_rne: 'Extrait Kbis / Attestation RNE',
};

const REQUIRED_DOCUMENTS = ['rib', 'cv', 'id_card_front', 'kbis_or_rne'];

const PERIODIC_LABELS: Record<string, string> = {
  urssaf_vigilance: 'Attestation de vigilance URSSAF',
  fiscal_regularity: 'Attestation de régularité fiscale',
};

const STATUS_MAP: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' | 'info' | 'default' }> = {
  pending: { label: 'En attente', variant: 'warning' },
  revision_requested: { label: 'Corrections demandées', variant: 'info' },
  approved: { label: 'Validée', variant: 'success' },
  rejected: { label: 'Refusée', variant: 'danger' },
  finalized: { label: 'Finalisée', variant: 'info' },
};

const REVIEW_BADGE: Record<DocumentReviewStatus, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'bg-slate-100 text-slate-600' },
  approved: { label: 'Validé', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Refusé', className: 'bg-red-100 text-red-700' },
};

export function FreelanceRegistrationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [registration, setRegistration] = useState<FreelanceRegistration | null>(null);
  const [documents, setDocuments] = useState<FreelanceDocument[]>([]);
  const [periodicDocs, setPeriodicDocs] = useState<FreelancePeriodicDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveCode, setApproveCode] = useState('');
  const [approveCountry, setApproveCountry] = useState<CountryCode>('FR');
  const [approving, setApproving] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [requestingRevision, setRequestingRevision] = useState(false);

  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [docRejectComment, setDocRejectComment] = useState('');

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reg, docs, pdocs] = await Promise.all([
        FreelanceService.getRegistrationById(id!),
        FreelanceService.getRegistrationDocuments(id!),
        FreelanceService.getRegistrationPeriodicDocuments(id!),
      ]);
      setRegistration(reg);
      setDocuments(docs);
      setPeriodicDocs(pdocs);
    } catch {
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
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

  const handleReviewDocument = async (docId: string, status: DocumentReviewStatus, comment: string | null = null) => {
    if (!user) return;
    try {
      await FreelanceService.reviewDocument(docId, status, comment, user.id);
      setRejectingDocId(null);
      setDocRejectComment('');
      await loadData();
    } catch {
      setError('Erreur lors de la validation du document');
    }
  };

  const handleReviewPeriodicDoc = async (docId: string, status: DocumentReviewStatus, comment: string | null = null) => {
    if (!user) return;
    try {
      await FreelanceService.reviewPeriodicDocument(docId, status, comment, user.id);
      setRejectingDocId(null);
      setDocRejectComment('');
      await loadData();
    } catch {
      setError('Erreur lors de la validation du document');
    }
  };

  const handleRequestRevision = async () => {
    if (!user) return;
    setRequestingRevision(true);
    setError('');
    try {
      await FreelanceService.requestRevision(id!, user.id);
      setSuccess('Demande de corrections envoyée au candidat');
      setShowRevisionModal(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la demande de corrections');
    } finally {
      setRequestingRevision(false);
    }
  };

  const handleApprove = async () => {
    if (!approveCode.trim() || !approveCountry || !user) return;
    setApproving(true);
    setError('');
    try {
      await FreelanceService.approveRegistration(id!, approveCode.trim(), approveCountry, user.id);
      setSuccess('Inscription validée avec succès');
      setShowApproveModal(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la validation');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim() || !user) return;
    setRejecting(true);
    setError('');
    try {
      await FreelanceService.rejectRegistration(id!, rejectReason.trim(), user.id);
      setSuccess('Inscription refusée');
      setShowRejectModal(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du refus');
    } finally {
      setRejecting(false);
    }
  };

  if (user?.role !== 'hr_manager' && user?.role !== 'super_admin') {
    return (
      <MainLayout>
        <div className="text-center py-12"><p className="text-slate-600">Accès non autorisé</p></div>
      </MainLayout>
    );
  }

  if (loading) {
    return <MainLayout><Loading text="Chargement..." /></MainLayout>;
  }

  if (!registration) {
    return (
      <MainLayout>
        <div className="text-center py-12"><p className="text-slate-600">Inscription introuvable</p></div>
      </MainLayout>
    );
  }

  const statusConfig = STATUS_MAP[registration.status] || STATUS_MAP.pending;

  const allRequiredDocsApproved = (() => {
    const requiredDocs = documents.filter(d => REQUIRED_DOCUMENTS.includes(d.document_type));
    const allReqApproved = requiredDocs.length >= REQUIRED_DOCUMENTS.length &&
      requiredDocs.every(d => d.review_status === 'approved');
    const periodicApproved = periodicDocs.every(d => d.review_status === 'approved');
    return allReqApproved && periodicApproved && periodicDocs.length > 0;
  })();

  const hasRejectedDocs = documents.some(d => d.review_status === 'rejected') ||
    periodicDocs.some(d => d.review_status === 'rejected');

  const approvedCount = documents.filter(d => d.review_status === 'approved').length +
    periodicDocs.filter(d => d.review_status === 'approved').length;
  const totalCount = documents.length + periodicDocs.length;

  const canTakeAction = registration.status === 'pending' || registration.status === 'revision_requested';

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/hr/registrations')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">
                  {registration.first_name} {registration.last_name}
                </h1>
                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Soumis le {new Date(registration.submitted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {canTakeAction && (
            <div className="flex items-center gap-2 flex-wrap">
              {hasRejectedDocs && registration.status !== 'revision_requested' && (
                <Button variant="secondary" onClick={() => setShowRevisionModal(true)}>
                  <Send className="w-4 h-4 mr-2" />
                  Demander des corrections
                </Button>
              )}
              <Button variant="secondary" onClick={() => setShowRejectModal(true)}>
                <XCircle className="w-4 h-4 mr-2" />
                Refuser
              </Button>
              <Button onClick={() => setShowApproveModal(true)} disabled={!allRequiredDocsApproved}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Valider
              </Button>
            </div>
          )}
        </div>

        {registration.status === 'approved' && registration.user_code && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">Inscription validée</span>
            </div>
            <p className="text-sm text-green-700">
              Code utilisateur : <strong>{registration.user_code}</strong> | Pays : <strong>{registration.country_code}</strong>
            </p>
          </div>
        )}

        {registration.status === 'rejected' && registration.rejection_reason && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800">Inscription refusée</span>
            </div>
            <p className="text-sm text-red-700">Motif : {registration.rejection_reason}</p>
          </div>
        )}

        {registration.status === 'revision_requested' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <span className="font-medium text-amber-800">Corrections demandées</span>
            </div>
            <p className="text-sm text-amber-700">
              Un email a été envoyé au candidat avec un lien pour corriger les documents refusés.
            </p>
          </div>
        )}

        {canTakeAction && totalCount > 0 && (
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-600">Documents validés</span>
                <span className="text-xs font-semibold text-slate-700">{approvedCount}/{totalCount}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(approvedCount / totalCount) * 100}%` }}
                />
              </div>
            </div>
            {!allRequiredDocsApproved && (
              <p className="text-xs text-slate-500 max-w-[200px]">
                Validez tous les documents obligatoires pour pouvoir approuver l'inscription
              </p>
            )}
          </div>
        )}

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-semibold text-slate-900">Informations personnelles</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <InfoRow label="Email" value={registration.email} />
            <InfoRow label="Téléphone" value={registration.phone} />
            <InfoRow label="Adresse" value={`${registration.address}, ${registration.postal_code} ${registration.city}`} />
            <InfoRow label="Pays" value={registration.country} />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-semibold text-slate-900">Adresse de livraison</h2>
          </div>
          {registration.delivery_same_as_postal ? (
            <p className="text-sm text-slate-600">Même adresse que l'adresse postale</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <InfoRow label="Adresse" value={`${registration.delivery_address}, ${registration.delivery_postal_code} ${registration.delivery_city}`} />
              <InfoRow label="Pays" value={registration.delivery_country || ''} />
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-semibold text-slate-900">Informations professionnelles</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <InfoRow label="SIRET" value={registration.siret} />
            <InfoRow label="Date d'immatriculation" value={new Date(registration.company_registration_date).toLocaleDateString('fr-FR')} />
            <InfoRow label="Rémunération" value={registration.remuneration} />
            <InfoRow label="Fréquence" value={registration.intervention_frequency} />
            <InfoRow label="Première animation" value={new Date(registration.first_animation_date).toLocaleDateString('fr-FR')} />
            {registration.last_animation_date && (
              <InfoRow label="Dernière animation" value={new Date(registration.last_animation_date).toLocaleDateString('fr-FR')} />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-semibold text-slate-900">Documents</h2>
          </div>
          <div className="space-y-3">
            {documents.map(doc => (
              <DocumentReviewRow
                key={doc.id}
                label={DOCUMENT_LABELS[doc.document_type] || doc.document_type}
                filename={doc.original_filename}
                reviewStatus={doc.review_status as DocumentReviewStatus}
                reviewComment={doc.review_comment}
                isRequired={REQUIRED_DOCUMENTS.includes(doc.document_type)}
                canReview={canTakeAction}
                isRejectingThis={rejectingDocId === doc.id}
                rejectComment={rejectingDocId === doc.id ? docRejectComment : ''}
                onDownload={() => handleDownload(doc.file_path)}
                onApprove={() => handleReviewDocument(doc.id, 'approved')}
                onStartReject={() => { setRejectingDocId(doc.id); setDocRejectComment(''); }}
                onCancelReject={() => setRejectingDocId(null)}
                onConfirmReject={() => handleReviewDocument(doc.id, 'rejected', docRejectComment || null)}
                onCommentChange={setDocRejectComment}
              />
            ))}
          </div>
        </Card>

        {periodicDocs.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-brand-600" />
              <h2 className="text-base font-semibold text-slate-900">Documents périodiques</h2>
            </div>
            <div className="space-y-3">
              {periodicDocs.map(doc => (
                <DocumentReviewRow
                  key={doc.id}
                  label={PERIODIC_LABELS[doc.document_type] || doc.document_type}
                  filename={`${doc.original_filename} - Expire le ${new Date(doc.expires_at).toLocaleDateString('fr-FR')}`}
                  reviewStatus={doc.review_status as DocumentReviewStatus}
                  reviewComment={doc.review_comment}
                  isRequired={true}
                  canReview={canTakeAction}
                  isRejectingThis={rejectingDocId === `periodic_${doc.id}`}
                  rejectComment={rejectingDocId === `periodic_${doc.id}` ? docRejectComment : ''}
                  onDownload={() => handleDownload(doc.file_path)}
                  onApprove={() => handleReviewPeriodicDoc(doc.id, 'approved')}
                  onStartReject={() => { setRejectingDocId(`periodic_${doc.id}`); setDocRejectComment(''); }}
                  onCancelReject={() => setRejectingDocId(null)}
                  onConfirmReject={() => handleReviewPeriodicDoc(doc.id, 'rejected', docRejectComment || null)}
                  onCommentChange={setDocRejectComment}
                />
              ))}
            </div>
          </Card>
        )}
      </div>

      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Valider l'inscription</h3>
            <p className="text-sm text-slate-600 mb-4">
              Précisez le code utilisateur créé dans le CRM et le pays d'affectation.
            </p>
            <div className="space-y-4">
              <Input
                label="Code utilisateur CRM *"
                value={approveCode}
                onChange={e => setApproveCode(e.target.value)}
                placeholder="Ex: MATRAT01"
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Pays *</label>
                <select
                  value={approveCountry}
                  onChange={e => setApproveCountry(e.target.value as CountryCode)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="FR">France</option>
                  <option value="ES">Espagne</option>
                  <option value="IT">Italie</option>
                  <option value="BE">Belgique</option>
                  <option value="CH">Suisse</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowApproveModal(false)}>Annuler</Button>
              <Button onClick={handleApprove} loading={approving} disabled={!approveCode.trim()}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Valider
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Refuser l'inscription</h3>
            <p className="text-sm text-slate-600 mb-4">
              Indiquez le motif du refus. Il sera communiqué au demandeur par email.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Motif du refus *</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                placeholder="Précisez le motif..."
              />
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowRejectModal(false)}>Annuler</Button>
              <Button variant="secondary" onClick={handleReject} loading={rejecting} disabled={!rejectReason.trim()}>
                <XCircle className="w-4 h-4 mr-2" />
                Refuser
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRevisionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Demander des corrections</h3>
            <p className="text-sm text-slate-600 mb-4">
              Un email sera envoyé au candidat avec la liste des documents refusés et vos commentaires.
              Il recevra un lien valable 7 jours pour corriger sa demande.
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <p className="text-sm font-medium text-amber-800 mb-2">Documents refusés :</p>
              <ul className="space-y-1">
                {documents.filter(d => d.review_status === 'rejected').map(d => (
                  <li key={d.id} className="text-xs text-amber-700">
                    - {DOCUMENT_LABELS[d.document_type] || d.document_type}
                    {d.review_comment && <span className="text-amber-600"> ({d.review_comment})</span>}
                  </li>
                ))}
                {periodicDocs.filter(d => d.review_status === 'rejected').map(d => (
                  <li key={d.id} className="text-xs text-amber-700">
                    - {PERIODIC_LABELS[d.document_type] || d.document_type}
                    {d.review_comment && <span className="text-amber-600"> ({d.review_comment})</span>}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowRevisionModal(false)}>Annuler</Button>
              <Button onClick={handleRequestRevision} loading={requestingRevision}>
                <Send className="w-4 h-4 mr-2" />
                Envoyer la demande
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess('')} />}
    </MainLayout>
  );
}

function DocumentReviewRow({
  label,
  filename,
  reviewStatus,
  reviewComment,
  isRequired,
  canReview,
  isRejectingThis,
  rejectComment,
  onDownload,
  onApprove,
  onStartReject,
  onCancelReject,
  onConfirmReject,
  onCommentChange,
}: {
  label: string;
  filename: string;
  reviewStatus: DocumentReviewStatus;
  reviewComment: string | null;
  isRequired: boolean;
  canReview: boolean;
  isRejectingThis: boolean;
  rejectComment: string;
  onDownload: () => void;
  onApprove: () => void;
  onStartReject: () => void;
  onCancelReject: () => void;
  onConfirmReject: () => void;
  onCommentChange: (v: string) => void;
}) {
  const badge = REVIEW_BADGE[reviewStatus];

  return (
    <div className={`rounded-lg border transition-colors ${
      reviewStatus === 'rejected' ? 'border-red-200 bg-red-50/50' :
      reviewStatus === 'approved' ? 'border-green-200 bg-green-50/30' :
      'border-slate-200 bg-slate-50'
    }`}>
      <div className="flex items-center justify-between p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-slate-700">{label}</p>
            {isRequired && <span className="text-[10px] text-slate-400 font-medium">obligatoire</span>}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{filename}</p>
        </div>
        <div className="flex items-center gap-1.5 ml-3">
          <button
            onClick={onDownload}
            className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            title="Télécharger"
          >
            <Download className="w-4 h-4" />
          </button>
          {canReview && reviewStatus !== 'approved' && (
            <button
              onClick={onApprove}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Valider ce document"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          {canReview && reviewStatus !== 'rejected' && (
            <button
              onClick={onStartReject}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Refuser ce document"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {reviewStatus === 'rejected' && reviewComment && !isRejectingThis && (
        <div className="px-3 pb-3">
          <div className="flex items-start gap-1.5 text-xs text-red-600">
            <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{reviewComment}</span>
          </div>
        </div>
      )}

      {isRejectingThis && (
        <div className="px-3 pb-3 border-t border-slate-200 pt-3">
          <label className="block text-xs font-medium text-slate-600 mb-1">Motif du refus (optionnel)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={rejectComment}
              onChange={e => onCommentChange(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              placeholder="Ex: Document illisible, date expirée..."
              autoFocus
            />
            <button
              onClick={onConfirmReject}
              className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Refuser
            </button>
            <button
              onClick={onCancelReject}
              className="px-3 py-1.5 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-slate-500">{label}</span>
      <p className="font-medium text-slate-900 mt-0.5">{value}</p>
    </div>
  );
}
