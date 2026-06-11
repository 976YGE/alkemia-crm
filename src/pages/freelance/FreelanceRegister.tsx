import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Upload, ArrowLeft, ArrowRight, Droplets, AlertCircle, FileText, User, Truck, Briefcase, Files, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Toast } from '../../components/ui/Toast';
import { FreelanceService } from '../../services/freelance.service';
import type { DocumentUpload, PeriodicDocumentUpload } from '../../services/freelance.service';

const STEPS = [
  { label: 'Informations', icon: User },
  { label: 'Livraison', icon: Truck },
  { label: 'Professionnel', icon: Briefcase },
  { label: 'Documents', icon: Files },
  { label: 'Périodiques', icon: RefreshCw },
  { label: 'Récapitulatif', icon: FileText },
];

const REQUIRED_DOCUMENTS = ['rib', 'cv', 'id_card_front', 'kbis_or_rne'];

const DOCUMENT_LABELS: Record<string, string> = {
  rib: 'RIB',
  cv: 'CV',
  id_card_front: 'Pièce d\'identité (recto)',
  id_card_back: 'Pièce d\'identité (verso)',
  kbis_or_rne: 'Extrait Kbis ou attestation RNE',
};

const PERIODIC_LABELS: Record<string, string> = {
  urssaf_vigilance: 'Attestation de vigilance URSSAF',
  fiscal_regularity: 'Attestation de régularité fiscale (SIE)',
};

export function FreelanceRegister() {
  const formStartedAt = useRef(new Date().toISOString());
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France',
    delivery_same_as_postal: true,
    delivery_address: '',
    delivery_city: '',
    delivery_postal_code: '',
    delivery_country: 'France',
    siret: '',
    company_registration_date: '',
    remuneration: '',
    intervention_frequency: '',
    first_animation_date: '',
    last_animation_date: '',
  });

  const [documents, setDocuments] = useState<Record<string, File | null>>({
    rib: null,
    cv: null,
    id_card_front: null,
    id_card_back: null,
    kbis_or_rne: null,
  });

  const [periodicDocuments, setPeriodicDocuments] = useState<Record<string, File | null>>({
    urssaf_vigilance: null,
    fiscal_regularity: null,
  });

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isCompanyOlderThanOneYear = () => {
    if (!formData.company_registration_date) return false;
    const regDate = new Date(formData.company_registration_date);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return regDate <= oneYearAgo;
  };

  const isSiretValid = (siret: string) => /^\d{14}$/.test(siret);

  const validateStep = (): boolean => {
    switch (step) {
      case 0:
        return !!(formData.first_name && formData.last_name && formData.email && formData.phone && formData.address && formData.city && formData.postal_code);
      case 1:
        if (formData.delivery_same_as_postal) return true;
        return !!(formData.delivery_address && formData.delivery_city && formData.delivery_postal_code);
      case 2:
        return !!(formData.siret && isSiretValid(formData.siret) && formData.company_registration_date && formData.remuneration && formData.intervention_frequency && formData.first_animation_date);
      case 3:
        return !!(documents.rib && documents.cv && documents.id_card_front && documents.kbis_or_rne);
      case 4:
        if (!periodicDocuments.urssaf_vigilance) return false;
        if (isCompanyOlderThanOneYear() && !periodicDocuments.fiscal_regularity) return false;
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const isFileNameDuplicate = (fileName: string, excludeType: string, isPeriodic: boolean): boolean => {
    const allFiles: File[] = [];
    Object.entries(documents).forEach(([type, file]) => {
      if (file && !(type === excludeType && !isPeriodic)) allFiles.push(file);
    });
    Object.entries(periodicDocuments).forEach(([type, file]) => {
      if (file && !(type === excludeType && isPeriodic)) allFiles.push(file);
    });
    return allFiles.some(f => f.name === fileName);
  };

  const [fileError, setFileError] = useState('');

  const handleFileChange = (type: string, file: File | null, isPeriodic = false) => {
    setFileError('');
    if (file && isFileNameDuplicate(file.name, type, isPeriodic)) {
      setFileError(`Le fichier "${file.name}" est déjà utilisé pour un autre document. Veuillez renommer le fichier ou en choisir un autre.`);
      return;
    }
    if (isPeriodic) {
      setPeriodicDocuments(prev => ({ ...prev, [type]: file }));
    } else {
      setDocuments(prev => ({ ...prev, [type]: file }));
    }
  };

  const handleSubmit = async () => {
    if (honeypot) return;

    const startedAt = new Date(formStartedAt.current).getTime();
    const now = Date.now();
    if (now - startedAt < 30000) {
      setError('Veuillez prendre le temps de remplir le formulaire.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const docUploads: DocumentUpload[] = Object.entries(documents)
        .filter(([, file]) => file !== null)
        .map(([type, file]) => ({ type: type as DocumentUpload['type'], file: file! }));

      const periodicUploads: PeriodicDocumentUpload[] = [];
      if (periodicDocuments.urssaf_vigilance) {
        const expires = new Date();
        expires.setMonth(expires.getMonth() + 6);
        periodicUploads.push({
          type: 'urssaf_vigilance',
          file: periodicDocuments.urssaf_vigilance,
          expires_at: expires.toISOString(),
        });
      }
      if (periodicDocuments.fiscal_regularity) {
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1);
        periodicUploads.push({
          type: 'fiscal_regularity',
          file: periodicDocuments.fiscal_regularity,
          expires_at: expires.toISOString(),
        });
      }

      await FreelanceService.submitRegistration(
        { ...formData, form_started_at: formStartedAt.current },
        docUploads,
        periodicUploads
      );

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Demande envoyée</h2>
          <p className="text-slate-600 mb-6">
            Votre demande d'inscription a bien été transmise. Un gestionnaire RH examinera votre dossier
            et vous recevrez un email de confirmation sous quelques jours.
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
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 text-white rounded-xl flex items-center justify-center">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Inscription Animateur</h1>
            <p className="text-sm text-slate-500">Formulaire d'inscription animateur non salarié</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    i < step ? 'bg-green-500 text-white' :
                    i === step ? 'bg-brand-600 text-white' :
                    'bg-slate-200 text-slate-400'
                  }`}>
                    {i < step ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium hidden sm:block ${
                    i <= step ? 'text-slate-700' : 'text-slate-400'
                  }`}>{s.label}</span>
                </div>
              );
            })}
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
            <div
              className="bg-brand-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${((step) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Honeypot (hidden from real users) */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={e => setHoneypot(e.target.value)}
          />
        </div>

        <Card className="p-6 sm:p-8">
          {/* Step 0: Personal Info */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Informations personnelles</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Prénom *" value={formData.first_name} onChange={e => updateField('first_name', e.target.value)} />
                <Input label="Nom *" value={formData.last_name} onChange={e => updateField('last_name', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Email *" type="email" value={formData.email} onChange={e => updateField('email', e.target.value)} />
                <Input label="Téléphone *" type="tel" value={formData.phone} onChange={e => updateField('phone', e.target.value)} />
              </div>
              <Input label="Adresse postale *" value={formData.address} onChange={e => updateField('address', e.target.value)} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Code postal *" value={formData.postal_code} onChange={e => updateField('postal_code', e.target.value)} />
                <Input label="Ville *" value={formData.city} onChange={e => updateField('city', e.target.value)} />
                <Input label="Pays" value={formData.country} onChange={e => updateField('country', e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 1: Delivery */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Adresse de livraison</h2>
              <p className="text-sm text-slate-600 mb-4">
                Dans le cadre de vos missions vous serez amené à distribuer des produits (dotation).
                Est-ce qu'il est possible de les livrer à votre adresse postale ?
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => updateField('delivery_same_as_postal', true)}
                  className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${
                    formData.delivery_same_as_postal
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <span className="text-sm font-medium">Oui, même adresse</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateField('delivery_same_as_postal', false)}
                  className={`flex-1 p-4 rounded-xl border-2 text-center transition-all ${
                    !formData.delivery_same_as_postal
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <span className="text-sm font-medium">Non, autre adresse</span>
                </button>
              </div>
              {!formData.delivery_same_as_postal && (
                <div className="space-y-4 pt-2">
                  <Input label="Adresse de livraison *" value={formData.delivery_address} onChange={e => updateField('delivery_address', e.target.value)} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input label="Code postal *" value={formData.delivery_postal_code} onChange={e => updateField('delivery_postal_code', e.target.value)} />
                    <Input label="Ville *" value={formData.delivery_city} onChange={e => updateField('delivery_city', e.target.value)} />
                    <Input label="Pays" value={formData.delivery_country} onChange={e => updateField('delivery_country', e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Professional Info */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Informations professionnelles</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="N° de SIRET *"
                    value={formData.siret}
                    onChange={e => updateField('siret', e.target.value.replace(/\s/g, ''))}
                    placeholder="14 chiffres"
                    maxLength={14}
                  />
                  {formData.siret && !isSiretValid(formData.siret) && (
                    <p className="text-xs text-red-500 mt-1">Le SIRET doit contenir exactement 14 chiffres</p>
                  )}
                </div>
                <Input label="Date d'immatriculation *" type="date" value={formData.company_registration_date} onChange={e => updateField('company_registration_date', e.target.value)} />
              </div>
              <Input label="Rémunération convenue avec le commercial *" value={formData.remuneration} onChange={e => updateField('remuneration', e.target.value)} placeholder="Ex: 300€/jour" />
              <Input label="Fréquence d'intervention *" value={formData.intervention_frequency} onChange={e => updateField('intervention_frequency', e.target.value)} placeholder="Ex: 2 jours/semaine" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Date de la première animation *" type="date" value={formData.first_animation_date} onChange={e => updateField('first_animation_date', e.target.value)} />
                <Input label="Date de la dernière animation (si prévue)" type="date" value={formData.last_animation_date} onChange={e => updateField('last_animation_date', e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Documents requis</h2>
              <p className="text-sm text-slate-500 mb-2">Formats acceptés : PDF, JPEG, PNG (max 10 Mo). Chaque fichier doit avoir un nom unique.</p>
              {fileError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {fileError}
                </div>
              )}
              {Object.entries(DOCUMENT_LABELS).map(([type, label]) => {
                const isRequired = REQUIRED_DOCUMENTS.includes(type);
                const displayLabel = isRequired
                  ? `${label} *`
                  : `${label} (optionnel - non requis pour les passeports)`;
                return (
                  <FileUploadField
                    key={type}
                    label={displayLabel}
                    file={documents[type]}
                    onChange={(file) => handleFileChange(type, file)}
                  />
                );
              })}
            </div>
          )}

          {/* Step 4: Periodic Documents */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Documents à périodicité</h2>
              <p className="text-sm text-slate-500 mb-4">
                Ces documents devront être renouvelés régulièrement. Vous recevrez un rappel automatique avant leur expiration.
              </p>
              {fileError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {fileError}
                </div>
              )}
              <FileUploadField
                label="Attestation de vigilance URSSAF * (à renouveler tous les 6 mois)"
                file={periodicDocuments.urssaf_vigilance}
                onChange={(file) => handleFileChange('urssaf_vigilance', file, true)}
              />
              {isCompanyOlderThanOneYear() ? (
                <FileUploadField
                  label="Attestation de régularité fiscale du SIE * (à renouveler chaque année)"
                  file={periodicDocuments.fiscal_regularity}
                  onChange={(file) => handleFileChange('fiscal_regularity', file, true)}
                />
              ) : (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-600">
                    L'attestation de régularité fiscale n'est pas requise pour les entreprises de moins d'un an.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Summary */}
          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Récapitulatif</h2>

              <SummarySection title="Informations personnelles">
                <SummaryRow label="Nom" value={`${formData.first_name} ${formData.last_name}`} />
                <SummaryRow label="Email" value={formData.email} />
                <SummaryRow label="Téléphone" value={formData.phone} />
                <SummaryRow label="Adresse" value={`${formData.address}, ${formData.postal_code} ${formData.city}, ${formData.country}`} />
              </SummarySection>

              <SummarySection title="Livraison">
                {formData.delivery_same_as_postal ? (
                  <SummaryRow label="Adresse" value="Même adresse que l'adresse postale" />
                ) : (
                  <SummaryRow label="Adresse" value={`${formData.delivery_address}, ${formData.delivery_postal_code} ${formData.delivery_city}, ${formData.delivery_country}`} />
                )}
              </SummarySection>

              <SummarySection title="Informations professionnelles">
                <SummaryRow label="SIRET" value={formData.siret} />
                <SummaryRow label="Rémunération" value={formData.remuneration} />
                <SummaryRow label="Fréquence" value={formData.intervention_frequency} />
                <SummaryRow label="Première animation" value={formData.first_animation_date} />
                {formData.last_animation_date && <SummaryRow label="Dernière animation" value={formData.last_animation_date} />}
              </SummarySection>

              <SummarySection title="Documents">
                {Object.entries(documents).filter(([, f]) => f).map(([type, file]) => (
                  <SummaryRow key={type} label={DOCUMENT_LABELS[type]} value={file!.name} />
                ))}
                {Object.entries(periodicDocuments).filter(([, f]) => f).map(([type, file]) => (
                  <SummaryRow key={type} label={PERIODIC_LABELS[type]} value={file!.name} />
                ))}
              </SummarySection>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 mt-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
            {step > 0 ? (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Précédent
              </Button>
            ) : (
              <Link to="/login" className="text-sm text-slate-500 hover:text-slate-700">
                Retour à la connexion
              </Link>
            )}

            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => { setError(''); setStep(step + 1); }}
                disabled={!validateStep()}
              >
                Suivant
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                loading={loading}
                disabled={loading}
              >
                Soumettre ma demande
              </Button>
            )}
          </div>
        </Card>
      </div>

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
    </div>
  );
}

function FileUploadField({ label, file, onChange }: { label: string; file: File | null; onChange: (file: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
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
            <span className="text-sm text-slate-500">Cliquez pour sélectionner un fichier</span>
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

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="px-4 py-3 space-y-2">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between text-sm">
      <span className="text-slate-500 mr-4">{label}</span>
      <span className="text-slate-900 font-medium text-right">{value}</span>
    </div>
  );
}
