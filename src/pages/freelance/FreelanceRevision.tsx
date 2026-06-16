import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Upload, AlertCircle, Droplets, FileText, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Toast } from '../../components/ui/Toast';
import { Loading } from '../../components/ui/Loading';
import { FreelanceService } from '../../services/freelance.service';
import type { FreelanceRegistration, FreelanceDocument, FreelancePeriodicDocument } from '../../types/database';

const DOCUMENT_LABELS: Record<string, string> = {
  rib: 'RIB',
  cv: 'CV',
  id_card_front: 'Pièce d\'identité (recto)',
  id_card_back: 'Pièce d\'identité (verso)',
  kbis_or_rne: 'Extrait Kbis ou attestation RNE',
};

const PERIODIC_LABELS: Record<string, string> = {
  urssaf_vigilance: 'Attestation de vigilance URSSAF',
  fiscal_regularity: 'Attestation de régularité fiscale',
};

export function FreelanceRevision() {
  const { token } = useParams<{ token: string }>();
  const [registration, setRegistration] = useState<FreelanceRegistration | null>(null);
  const [documents, setDocuments] = useState<FreelanceDocument[]>([]);
  const [periodicDocs, setPeriodicDocs] = useState<FreelancePeriodicDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [invalidToken, setInvalidToken] = useState(false);

  const [replacements, setReplacements] = useState<Record<string, File>>({});
  const [periodicReplacements, setPeriodicReplacements] = useState<Record<string, File>>({});
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const loadData = async () => {
    try {
      const reg = await FreelanceService.getRegistrationByToken(token!);
      if (!reg) {
        setInvalidToken(true);
        return;
      }
      setRegistration(reg);

      const [docs, pdocs] = await Promise.all([
        FreelanceService.getDocumentsByToken(token!),
        FreelanceService.getPeriodicDocumentsByToken(token!),
      ]);
      setDocuments(docs);
      setPeriodicDocs(pdocs);
    } catch {
      setInvalidToken(true);
    } finally {
      setLoading(false);
    }
  };

  const rejectedDocs = documents.filter(d => d.review_status === 'rejected');
  const rejectedPeriodicDocs = periodicDocs.filter(d => d.review_status === 'rejected');

  const allRejectedHaveReplacement = () => {
    const docsOk = rejectedDocs.every(d => replacements[d.id]);
    const periodicOk = rejectedPeriodicDocs.every(d => periodicReplacements[d.id]);
    return docsOk && periodicOk;
  };

  const isFileNameDuplicate = (fileName: string, excludeId: string): boolean => {
    const allFiles: File[] = [];
    Object.entries(replacements).forEach(([id, file]) => {
      if (id !== excludeId) allFiles.push(file);
    });
    Object.entries(periodicReplacements).forEach(([id, file]) => {
      if (id !== excludeId) allFiles.push(file);
    });
    return allFiles.some(f => f.name === fileName);
  };

  const handleFileSelect = (docId: string, file: File | null, isPeriodic = false) => {
    setFileError('');
    if (file && isFileNameDuplicate(file.name, docId)) {
      setFileError(`Le fichier "${file.name}" est déjà utilisé pour un autre document.`);
      return;
    }
    if (isPeriodic) {
      setPeriodicReplacements(prev => {
        const next = { ...prev };
        if (file) next[docId] = file;
        else delete next[docId];
        return next;
      });
    } else {
      setReplacements(prev => {
        const next = { ...prev };
        if (file) next[docId] = file;
        else delete next[docId];
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    if (!registration || !token) return;
    setSubmitting(true);
    setError('');

    try {
      for (const [docId, file] of Object.entries(replacements)) {
        await FreelanceService.resubmitDocument(registration.id, docId, file);
      }
      for (const [docId, file] of Object.entries(periodicReplacements)) {
        await FreelanceService.resubmitPeriodicDocument(registration.id, docId, file);
      }
      await FreelanceService.completeRevision(registration.id, token);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loading text="Chargement..." />
      </div>
    );
  }

  if (invalidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Lien invalide ou expiré</h2>
          <p className="text-slate-600 mb-6">
            Ce lien de correction n'est plus valide. Il a peut-être expiré (7 jours) ou votre demande a déjà été traitée.
          </p>
          <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium text-sm">
            Retour à la connexion
          </Link>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Corrections envoyées</h2>
          <p className="text-slate-600 mb-6">
            Vos documents corrigés ont bien été transmis. L'équipe RH va les examiner à nouveau.
            Vous recevrez un email une fois la décision prise.
          </p>
          <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium text-sm">
            Retour à la connexion
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 text-white rounded-xl flex items-center justify-center">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Correction de votre dossier</h1>
            <p className="text-sm text-slate-500">
              {registration?.first_name} {registration?.last_name}
            </p>
          </div>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Des corrections sont demandées sur votre dossier
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Veuillez remplacer les documents listés ci-dessous puis renvoyer votre demande.
              </p>
            </div>
          </div>

          {fileError && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {fileError}
            </div>
          )}

          <div className="space-y-4">
            {rejectedDocs.map(doc => (
              <RevisionUploadField
                key={doc.id}
                label={DOCUMENT_LABELS[doc.document_type] || doc.document_type}
                comment={doc.review_comment}
                file={replacements[doc.id] || null}
                onChange={(file) => handleFileSelect(doc.id, file)}
              />
            ))}
            {rejectedPeriodicDocs.map(doc => (
              <RevisionUploadField
                key={doc.id}
                label={PERIODIC_LABELS[doc.document_type] || doc.document_type}
                comment={doc.review_comment}
                file={periodicReplacements[doc.id] || null}
                onChange={(file) => handleFileSelect(doc.id, file, true)}
              />
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 mt-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end">
            <Button
              onClick={handleSubmit}
              loading={submitting}
              disabled={!allRejectedHaveReplacement() || submitting}
            >
              <FileText className="w-4 h-4 mr-2" />
              Renvoyer ma demande
            </Button>
          </div>
        </Card>
      </div>

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
    </div>
  );
}

function RevisionUploadField({
  label,
  comment,
  file,
  onChange,
}: {
  label: string;
  comment: string | null;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border border-red-200 rounded-xl p-4 bg-red-50/30">
      <div className="flex items-center gap-2 mb-2">
        <XCircle className="w-4 h-4 text-red-500" />
        <span className="text-sm font-medium text-slate-800">{label}</span>
      </div>
      {comment && (
        <p className="text-xs text-red-600 mb-3 pl-6">Motif : {comment}</p>
      )}
      <div
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          file ? 'border-green-300 bg-green-50' : 'border-slate-300 hover:border-brand-400 hover:bg-brand-50/30'
        }`}
        onClick={() => inputRef.current?.click()}
      >
        {file ? (
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700 font-medium truncate max-w-[200px]">{file.name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="text-xs text-slate-500 hover:text-red-500 ml-2"
            >
              Supprimer
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Upload className="w-5 h-5 text-slate-400" />
            <span className="text-sm text-slate-500">Cliquez pour sélectionner le nouveau fichier</span>
            <span className="text-xs text-slate-400">PDF, JPEG, PNG (max 10 Mo)</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={e => onChange(e.target.files?.[0] || null)}
      />
    </div>
  );
}
