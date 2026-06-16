import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, Save, Calendar, Clock, FileCheck } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationsService, UserNotificationPreferences } from '../../services/notifications.service';

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}

function ToggleRow({ icon, label, description, enabled, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-slate-100 last:border-0">
      <div className="flex items-start gap-4 flex-1 mr-6">
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${enabled ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400'}`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900">{label}</p>
          <p className="text-sm text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative flex-shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${enabled ? 'bg-brand-600' : 'bg-slate-200'}`}
        aria-checked={enabled}
        role="switch"
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </div>
  );
}

export function NotificationSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<UserNotificationPreferences>({
    user_id: user?.id || '',
    notify_day_before: true,
    notify_end_of_day: true,
    notify_cr_summary: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!user) return;
    NotificationsService.getUserPreferences(user.id)
      .then(setPrefs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await NotificationsService.saveUserPreferences(prefs);
      setToast({ message: t('notifications.saved'), type: 'success' });
    } catch {
      setToast({ message: t('common.error'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('notifications.title')}</h1>
          <p className="mt-1 text-slate-500">{t('notifications.subtitle')}</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-brand-600" />
              <CardTitle>{t('notifications.myPreferences')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100">
              <ToggleRow
                icon={<Calendar className="w-5 h-5" />}
                label={t('notifications.dayBefore')}
                description={t('notifications.dayBeforeDesc')}
                enabled={prefs.notify_day_before}
                onChange={(v) => setPrefs(p => ({ ...p, notify_day_before: v }))}
              />
              <ToggleRow
                icon={<Clock className="w-5 h-5" />}
                label={t('notifications.endOfDay')}
                description={t('notifications.endOfDayDesc')}
                enabled={prefs.notify_end_of_day}
                onChange={(v) => setPrefs(p => ({ ...p, notify_end_of_day: v }))}
              />
              <ToggleRow
                icon={<FileCheck className="w-5 h-5" />}
                label={t('notifications.crSummary')}
                description={t('notifications.crSummaryDesc')}
                enabled={prefs.notify_cr_summary}
                onChange={(v) => setPrefs(p => ({ ...p, notify_cr_summary: v }))}
              />
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                {prefs.notify_day_before || prefs.notify_end_of_day || prefs.notify_cr_summary
                  ? <><Bell className="w-4 h-4 text-brand-500" />{t('notifications.enabled')}</>
                  : <><BellOff className="w-4 h-4 text-slate-400" />{t('notifications.disabled')}</>
                }
              </div>
              <Button onClick={handleSave} loading={saving}>
                <Save className="w-4 h-4 mr-2" />
                {t('common.save')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
          <p className="text-sm text-brand-700">
            Les notifications sont envoyées à votre adresse email : <strong>{user?.email}</strong>
          </p>
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
