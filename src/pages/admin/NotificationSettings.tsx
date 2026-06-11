import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Save, Plus, X, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Toast } from '../../components/ui/Toast';
import { Loading } from '../../components/ui/Loading';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationsService, AdminNotificationSettings as AdminNotifSettings } from '../../services/notifications.service';
import { supabase } from '../../lib/supabase';

const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France',
  ES: 'Espagne',
  IT: 'Italie',
  BE: 'Belgique',
  CH: 'Suisse',
};

const COUNTRY_FLAGS: Record<string, string> = {
  FR: '🇫🇷',
  ES: '🇪🇸',
  IT: '🇮🇹',
  BE: '🇧🇪',
  CH: '🇨🇭',
};

interface CountrySettingsCardProps {
  countryCode: string;
  settings: AdminNotifSettings;
  onChange: (settings: AdminNotifSettings) => void;
  onSave: (settings: AdminNotifSettings) => Promise<void>;
}

function CountrySettingsCard({ countryCode, settings, onChange, onSave }: CountrySettingsCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const handleAddRecipient = () => {
    const email = newEmail.trim();
    if (!email || !email.includes('@')) return;
    if (settings.additional_recipients.includes(email)) return;
    onChange({ ...settings, additional_recipients: [...settings.additional_recipients, email] });
    setNewEmail('');
  };

  const handleRemoveRecipient = (email: string) => {
    onChange({
      ...settings,
      additional_recipients: settings.additional_recipients.filter(e => e !== email),
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(settings);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{COUNTRY_FLAGS[countryCode] || '🌍'}</span>
          <div>
            <p className="font-semibold text-slate-900">{COUNTRY_NAMES[countryCode] || countryCode}</p>
            <p className="text-sm text-slate-500">
              {settings.notify_on_cr_submit ? t('notifications.enabled') : t('notifications.disabled')}
              {settings.additional_recipients.length > 0 && ` · ${settings.additional_recipients.length} destinataire(s)`}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>

      {expanded && (
        <CardContent className="border-t border-slate-100 pt-4">
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-6">
                <p className="text-sm font-medium text-slate-900">{t('notifications.notifyOnCrSubmit')}</p>
                <p className="text-sm text-slate-500 mt-0.5">{t('notifications.notifyOnCrSubmitDesc')}</p>
              </div>
              <button
                type="button"
                onClick={() => onChange({ ...settings, notify_on_cr_submit: !settings.notify_on_cr_submit })}
                className={`relative flex-shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${settings.notify_on_cr_submit ? 'bg-brand-600' : 'bg-slate-200'}`}
                aria-checked={settings.notify_on_cr_submit}
                role="switch"
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.notify_on_cr_submit ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex items-start justify-between">
              <div className="flex-1 mr-6">
                <p className="text-sm font-medium text-slate-900">Inscriptions freelance</p>
                <p className="text-sm text-slate-500 mt-0.5">Recevoir les notifications de nouvelles demandes d'inscription animateur non salarié</p>
              </div>
              <button
                type="button"
                onClick={() => onChange({ ...settings, notify_on_freelance_registration: !settings.notify_on_freelance_registration })}
                className={`relative flex-shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${settings.notify_on_freelance_registration ? 'bg-brand-600' : 'bg-slate-200'}`}
                aria-checked={settings.notify_on_freelance_registration}
                role="switch"
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.notify_on_freelance_registration ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-900 mb-1">{t('notifications.additionalRecipients')}</p>
              <p className="text-sm text-slate-500 mb-3">{t('notifications.additionalRecipientsDesc')}</p>

              <div className="space-y-2 mb-3">
                {settings.additional_recipients.map(email => (
                  <div key={email} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                    <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-slate-700 flex-1 truncate">{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(email)}
                      className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {settings.additional_recipients.length === 0 && (
                  <p className="text-sm text-slate-400 italic">{t('notifications.noSettings')}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder={t('notifications.emailPlaceholder')}
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddRecipient())}
                  icon={<Mail className="w-4 h-4 text-slate-400" />}
                />
                <Button type="button" onClick={handleAddRecipient} variant="secondary" size="md">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button onClick={handleSave} loading={saving}>
                <Save className="w-4 h-4 mr-2" />
                {t('common.save')}
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function AdminNotificationSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [countries, setCountries] = useState<string[]>([]);
  const [settings, setSettings] = useState<Record<string, AdminNotifSettings>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: countriesData } = await supabase
        .from('countries')
        .select('code')
        .eq('active', true)
        .order('code');

      const codes = (countriesData || []).map((c: { code: string }) => c.code);
      setCountries(codes);

      const settingsMap: Record<string, AdminNotifSettings> = {};
      for (const code of codes) {
        settingsMap[code] = await NotificationsService.getAdminSettings(code);
      }
      setSettings(settingsMap);
    } catch {
      setToast({ message: t('common.error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (countryCode: string, updated: AdminNotifSettings) => {
    setSettings(prev => ({ ...prev, [countryCode]: updated }));
  };

  const handleSave = async (countrySettings: AdminNotifSettings) => {
    try {
      await NotificationsService.saveAdminSettings(countrySettings);
      setToast({ message: t('notifications.saved'), type: 'success' });
    } catch {
      setToast({ message: t('common.error'), type: 'error' });
    }
  };

  if (loading) return <MainLayout><Loading /></MainLayout>;

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('notifications.adminTitle')}</h1>
          <p className="mt-1 text-slate-500">{t('notifications.adminSubtitle')}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <Bell className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Configuration des notifications automatiques</p>
            <p className="text-sm text-amber-700 mt-1">
              Les notifications J-1 (8h00) et fin de journée (18h00) sont déclenchées automatiquement
              via des tâches planifiées sur le serveur. Contactez votre administrateur technique pour
              configurer le cron si nécessaire.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {countries.length === 0 && (
            <Card><CardContent><p className="text-slate-500 text-sm py-4">{t('notifications.noSettings')}</p></CardContent></Card>
          )}
          {countries.map(code => (
            <CountrySettingsCard
              key={code}
              countryCode={code}
              settings={settings[code] || { country_code: code, notify_on_cr_submit: false, notify_on_freelance_registration: true, additional_recipients: [] }}
              onChange={(updated) => handleChange(code, updated)}
              onSave={handleSave}
            />
          ))}
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </MainLayout>
  );
}
