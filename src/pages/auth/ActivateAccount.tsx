import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserCheck, Mail, Lock, Globe } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Toast } from '../../components/ui/Toast';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/auth.service';

const countryFlags: Record<string, string> = {
  FR: '🇫🇷',
  ES: '🇪🇸',
  IT: '🇮🇹',
  BE: '🇧🇪',
  CH: '🇨🇭'
};

const countryToLanguage: Record<string, string> = {
  FR: 'fr',
  BE: 'fr',
  CH: 'fr',
  ES: 'es',
  IT: 'it',
  DE: 'de',
};

export function ActivateAccount() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { activateAccount } = useAuth();

  const [step, setStep] = useState<'country' | 'code' | 'account'>('country');
  const [availableCountries, setAvailableCountries] = useState<Array<{ code: string; name: string }>>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userCodeId, setUserCodeId] = useState('');
  const [userName, setUserName] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const countries = await AuthService.getAvailableCountries();
        setAvailableCountries(countries);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('common.error'));
      }
    };

    loadCountries();
  }, [t]);

  const handleCountrySelect = (countryCode: string) => {
    setSelectedCountry(countryCode);
    const lang = countryToLanguage[countryCode];
    if (lang) {
      i18n.changeLanguage(lang);
      localStorage.setItem('language', lang);
    }
    setStep('code');
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCode = await AuthService.verifyUserCode(code, selectedCountry);

      if (!userCode) {
        setError(t('auth.codeNotFound'));
        setLoading(false);
        return;
      }

      setUserCodeId(userCode.id);
      setUserName(`${userCode.first_name} ${userCode.last_name}`);
      setStep('account');
    } catch (err) {
      if (err instanceof Error && err.message === 'CODE_ALREADY_ACTIVATED') {
        setError(t('auth.codeAlreadyActivated'));
      } else if (err instanceof Error && err.message === 'CODE_INACTIVE') {
        setError(t('auth.codeInactive'));
      } else {
        setError(err instanceof Error ? err.message : t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError(t('auth.emailInvalid'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordsDontMatch'));
      return;
    }

    if (!privacyAccepted) {
      setError(t('privacy.accept'));
      return;
    }

    setLoading(true);

    try {
      const { error: activationError } = await activateAccount(userCodeId, email, password);

      if (activationError) {
        setError(activationError);
        setLoading(false);
        return;
      }

      navigate('/agenda');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] bg-brand-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/4 w-[600px] h-[600px] bg-slate-600/20 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 text-white rounded-full mb-4">
            {step === 'country' ? <Globe className="w-8 h-8" /> : <UserCheck className="w-8 h-8" />}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {step === 'country'
              ? 'Sélectionnez votre pays'
              : step === 'code'
              ? t('auth.activationTitle')
              : t('auth.createAccountTitle')}
          </h1>
          <p className="text-slate-300">
            {step === 'country'
              ? 'Choisissez le pays correspondant à votre code utilisateur'
              : step === 'code'
              ? t('auth.activationSubtitle')
              : t('auth.createAccountSubtitle')}
          </p>
          {step === 'account' && userName && (
            <p className="mt-2 text-sm font-medium text-brand-300">{userName}</p>
          )}
        </div>

        <Card>
          {step === 'country' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {availableCountries.map((country) => (
                  <button
                    key={country.code}
                    onClick={() => handleCountrySelect(country.code)}
                    className="flex flex-col items-center justify-center p-6 bg-white border-2 border-slate-200 rounded-lg hover:border-brand-500 hover:bg-brand-50 transition-all duration-200 group"
                  >
                    <span className="text-5xl mb-3 group-hover:scale-110 transition-transform">
                      {countryFlags[country.code]}
                    </span>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-brand-600">
                      {country.name}
                    </span>
                  </button>
                ))}
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-sm text-brand-600 hover:text-brand-700"
                >
                  {t('auth.signIn')}
                </button>
              </div>
            </div>
          ) : step === 'code' ? (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="flex items-center justify-center mb-4">
                <span className="text-4xl mr-2">{countryFlags[selectedCountry]}</span>
                <span className="text-lg font-medium text-slate-700">
                  {availableCountries.find(c => c.code === selectedCountry)?.name}
                </span>
              </div>

              <Input
                type="text"
                label={t('auth.userCode')}
                placeholder={t('auth.enterUserCode')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                icon={<UserCheck className="w-5 h-5 text-slate-400" />}
                required
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep('country')}
                  fullWidth
                >
                  {t('common.back')}
                </Button>
                <Button type="submit" fullWidth loading={loading}>
                  {t('common.next')}
                </Button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-sm text-brand-600 hover:text-brand-700"
                >
                  {t('auth.signIn')}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <Input
                type="email"
                label={t('auth.email')}
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-5 h-5 text-slate-400" />}
                required
              />

              <Input
                type="password"
                label={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-5 h-5 text-slate-400" />}
                required
              />

              <Input
                type="password"
                label={t('auth.confirmPassword')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock className="w-5 h-5 text-slate-400" />}
                required
              />

              <div className="pt-1">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={privacyAccepted}
                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500 flex-shrink-0"
                  />
                  <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">
                    {t('privacy.iAcceptThe')}{' '}
                    <Link
                      to="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:text-brand-700 font-medium underline underline-offset-2"
                    >
                      {t('privacy.privacyPolicy')}
                    </Link>
                  </span>
                </label>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep('code')}
                  fullWidth
                >
                  {t('common.back')}
                </Button>
                <Button type="submit" fullWidth loading={loading} disabled={!privacyAccepted}>
                  {t('auth.activateAccount')}
                </Button>
              </div>
            </form>
          )}
        </Card>

        {error && (
          <Toast
            message={error}
            type="error"
            onClose={() => setError('')}
          />
        )}
      </div>
    </div>
  );
}
