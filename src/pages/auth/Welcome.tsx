import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Droplets, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Toast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';

export function Welcome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled && session?.user) {
        setAuthorized(true);
        setEmail(session.user.email || '');
        const meta = (session.user.user_metadata || {}) as Record<string, string>;
        setFirstName(meta.first_name || '');
        setLoading(false);
        return;
      }

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (cancelled) return;
        if (session?.user) {
          setAuthorized(true);
          setEmail(session.user.email || '');
          const meta = (session.user.user_metadata || {}) as Record<string, string>;
          setFirstName(meta.first_name || '');
          setLoading(false);
        }
      });

      setTimeout(() => {
        if (!cancelled) setLoading(false);
      }, 1500);

      return () => sub.subscription.unsubscribe();
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;

      setSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du mot de passe');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-300">Chargement...</div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="relative overflow-hidden min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="w-full max-w-md text-center">
          <Card>
            <div className="text-slate-700">
              <h1 className="text-xl font-bold mb-2">Lien invalide ou expiré</h1>
              <p className="text-sm text-slate-600 mb-6">
                Le lien d'invitation n'est plus valide. Demandez à votre administrateur de vous renvoyer une invitation.
              </p>
              <Button fullWidth onClick={() => navigate('/login')}>
                Aller à la connexion
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] bg-brand-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/4 w-[600px] h-[600px] bg-slate-600/20 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 text-white rounded-2xl mb-4 shadow-lg">
            <Droplets className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {firstName ? `Bienvenue ${firstName}` : 'Bienvenue'}
          </h1>
          <p className="text-slate-300">Définissez votre mot de passe pour finaliser votre compte</p>
          {email && <p className="text-sm text-slate-400 mt-2">{email}</p>}
        </div>

        <Card>
          {success ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-slate-900 font-medium">Compte activé !</p>
              <p className="text-sm text-slate-600 mt-1">Redirection en cours...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="password"
                label="Nouveau mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-5 h-5 text-slate-400" />}
                placeholder="8 caractères minimum"
                autoComplete="new-password"
                required
              />
              <Input
                type="password"
                label="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock className="w-5 h-5 text-slate-400" />}
                autoComplete="new-password"
                required
              />
              <Button type="submit" fullWidth loading={submitting}>
                Activer mon compte
              </Button>
            </form>
          )}
        </Card>
      </div>

      {error && <Toast message={error} type="error" onClose={() => setError('')} />}
    </div>
  );
}
