import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, User as UserIcon, Globe, Languages, Shield, Hash, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Toast } from '../../components/ui/Toast';
import { Loading } from '../../components/ui/Loading';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { AdminUsersService, type UserRole } from '../../services/admin-users.service';

interface Country {
  code: string;
  name: string;
}

interface UserCodeOption {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  country_code: string;
}

const ROLE_OPTIONS: Array<{ value: UserRole; label: string; description: string }> = [
  {
    value: 'animator',
    label: 'Animateur',
    description: 'Accède à son agenda, ses comptes rendus et ses clients.',
  },
  {
    value: 'hr_manager',
    label: 'Ressources humaines',
    description: 'Gère les inscriptions freelance et les documents périodiques.',
  },
  {
    value: 'admin',
    label: 'Administrateur',
    description: 'Gestion des utilisateurs et des opérations.',
  },
  {
    value: 'super_admin',
    label: 'Super administrateur',
    description: 'Accès complet, y compris configuration SFTP et catalogue.',
  },
];

const LANGUAGE_OPTIONS = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
  { value: 'de', label: 'Deutsch' },
];

export function CreateUser() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [countries, setCountries] = useState<Country[]>([]);
  const [availableCodes, setAvailableCodes] = useState<UserCodeOption[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole>('animator');
  const [countryCode, setCountryCode] = useState('FR');
  const [language, setLanguage] = useState('fr');
  const [userCodeId, setUserCodeId] = useState<string>('');
  const [codeSearch, setCodeSearch] = useState('');

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  useEffect(() => {
    const init = async () => {
      try {
        const { data: countriesData, error: countriesErr } = await supabase
          .from('countries')
          .select('code, name')
          .eq('active', true)
          .order('name');
        if (countriesErr) throw countriesErr;
        setCountries(countriesData || []);
        if (countriesData && countriesData.length && !countriesData.find(c => c.code === 'FR')) {
          setCountryCode(countriesData[0].code);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (role !== 'animator') {
      setUserCodeId('');
      setAvailableCodes([]);
      return;
    }

    const loadCodes = async () => {
      setCodesLoading(true);
      try {
        const { data: codesData, error: codesErr } = await supabase
          .from('user_codes')
          .select('id, code, first_name, last_name, country_code')
          .eq('country_code', countryCode)
          .eq('is_active', true)
          .order('last_name');
        if (codesErr) throw codesErr;

        const ids = (codesData || []).map(c => c.id);
        let linkedIds = new Set<string>();
        if (ids.length) {
          const { data: linked } = await supabase
            .from('users')
            .select('user_code_id')
            .in('user_code_id', ids);
          linkedIds = new Set((linked || []).map(l => l.user_code_id).filter(Boolean) as string[]);
        }
        setAvailableCodes((codesData || []).filter(c => !linkedIds.has(c.id)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement des codes');
      } finally {
        setCodesLoading(false);
      }
    };
    loadCodes();
  }, [role, countryCode]);

  const filteredCodes = useMemo(() => {
    const q = codeSearch.trim().toLowerCase();
    if (!q) return availableCodes;
    return availableCodes.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q)
    );
  }, [availableCodes, codeSearch]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = 'Prénom obligatoire';
    if (!lastName.trim()) errs.lastName = 'Nom obligatoire';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Email invalide';
    }
    if (!countryCode) errs.countryCode = 'Pays obligatoire';
    if (!role) errs.role = 'Rôle obligatoire';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const result = await AdminUsersService.createUser({
        email: email.trim().toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        countryCode,
        language,
        userCodeId: userCodeId || null,
      });

      if (!result.success) {
        setError(result.message);
        return;
      }

      setSuccessMessage(result.message);
      setTimeout(() => navigate('/admin/users'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <MainLayout><Loading /></MainLayout>;

  if (!isAdmin) {
    return (
      <MainLayout>
        <Card>
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <p>Accès refusé : droits administrateur requis.</p>
          </div>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/users')}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Nouvel utilisateur</h1>
            <p className="text-slate-600 mt-0.5">
              Créez un compte et envoyez-lui une invitation par email pour qu'il définisse son mot de passe.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <UserIcon className="w-5 h-5 text-brand-600" />
              <h2 className="text-base font-semibold text-slate-900">Informations</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Prénom"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                error={fieldErrors.firstName}
                placeholder="Jean"
                required
              />
              <Input
                label="Nom"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                error={fieldErrors.lastName}
                placeholder="Dupont"
                required
              />
              <div className="sm:col-span-2">
                <Input
                  type="email"
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={fieldErrors.email}
                  placeholder="prenom.nom@exemple.com"
                  icon={<Mail className="w-5 h-5 text-slate-400" />}
                  required
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-brand-600" />
              <h2 className="text-base font-semibold text-slate-900">Rôle & accès</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={`text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                    role === opt.value
                      ? 'border-brand-500 bg-brand-50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-semibold ${
                      role === opt.value ? 'text-brand-700' : 'text-slate-900'
                    }`}>
                      {opt.label}
                    </span>
                    {role === opt.value && (
                      <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{opt.description}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-brand-600" />
              <h2 className="text-base font-semibold text-slate-900">Localisation</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Pays</label>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  {countries.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
                {fieldErrors.countryCode && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.countryCode}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <span className="inline-flex items-center gap-1">
                    <Languages className="w-3.5 h-3.5" />
                    Langue préférée
                  </span>
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  {LANGUAGE_OPTIONS.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {role === 'animator' && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Hash className="w-5 h-5 text-brand-600" />
                <h2 className="text-base font-semibold text-slate-900">Code CRM (optionnel)</h2>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                Liez ce compte à un code utilisateur déjà importé depuis le CRM. Laissez vide pour créer un compte autonome.
              </p>
              <Input
                type="text"
                placeholder="Rechercher un code..."
                value={codeSearch}
                onChange={(e) => setCodeSearch(e.target.value)}
              />
              <div className="mt-3 max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                <button
                  type="button"
                  onClick={() => setUserCodeId('')}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    !userCodeId ? 'bg-brand-50 text-brand-700 font-medium' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  Aucun code (compte autonome)
                </button>
                {codesLoading ? (
                  <div className="px-3 py-4 text-sm text-slate-500">Chargement...</div>
                ) : filteredCodes.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-slate-500">Aucun code disponible pour ce pays</div>
                ) : (
                  filteredCodes.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setUserCodeId(c.id)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                        userCodeId === c.id ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>
                        <span className="font-mono font-medium">{c.code}</span>
                        <span className="ml-2 text-slate-600">{c.first_name} {c.last_name}</span>
                      </span>
                      {userCodeId === c.id && <CheckCircle2 className="w-4 h-4 text-brand-600" />}
                    </button>
                  ))
                )}
              </div>
            </Card>
          )}

          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/admin/users')}>
              Annuler
            </Button>
            <Button type="submit" loading={submitting}>
              <Send className="w-4 h-4 mr-2" />
              Créer et envoyer l'invitation
            </Button>
          </div>
        </form>
      </div>

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
      {successMessage && (
        <Toast message={successMessage} type="success" onClose={() => setSuccessMessage('')} />
      )}
    </MainLayout>
  );
}
