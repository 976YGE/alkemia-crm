import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Droplets } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Toast } from '../../components/ui/Toast';
import { LanguageSwitcher } from '../../components/ui/LanguageSwitcher';
import { useAuth } from '../../contexts/AuthContext';

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        setError(t('auth.invalidCredentials'));
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-50 via-brand-50/30 to-slate-100 px-4">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] bg-brand-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/4 w-[600px] h-[600px] bg-slate-200/40 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/3 w-[400px] h-[400px] bg-brand-100/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-brand-400 to-brand-600 text-white rounded-2xl mb-5 shadow-glow">
            <Droplets className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Alkemia</h1>
          <p className="text-slate-500">
            {t('auth.welcomeBack')}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-float border border-slate-200/60">
          <form onSubmit={handleSubmit} className="space-y-5">
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

            <Button type="submit" fullWidth loading={loading} size="lg">
              {t('auth.signIn')}
            </Button>

            <div className="text-center pt-2 space-y-2">
              <button
                type="button"
                onClick={() => navigate('/activate')}
                className="text-sm text-brand-600 hover:text-brand-700 transition-colors"
              >
                {t('auth.activateAccount')}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          {typeof __APP_VERSION__ !== 'undefined' ? `v${__APP_VERSION__}` : ''}
        </p>
      </div>

      {error && (
        <Toast
          message={error}
          type="error"
          onClose={() => setError('')}
        />
      )}
    </div>
  );
}
