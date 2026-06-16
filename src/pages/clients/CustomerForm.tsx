import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Toast } from '../../components/ui/Toast';
import { CustomersService } from '../../services/customers.service';
import type { CountryCode } from '../../types';

const COUNTRIES: { code: CountryCode; label: string }[] = [
  { code: 'FR', label: 'France' },
  { code: 'ES', label: 'Espagne' },
  { code: 'IT', label: 'Italie' },
  { code: 'BE', label: 'Belgique' },
  { code: 'CH', label: 'Suisse' },
];

export function CustomerForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    email: '',
    type: 'client' as 'prospect' | 'client',
    country_code: 'FR' as CountryCode,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = t('clients.nameRequired');
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = t('clients.invalidEmail');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const customer = await CustomersService.createCustomer({
        name: form.name.trim(),
        country_code: form.country_code,
        type: form.type,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        postal_code: form.postal_code.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      setToast({ type: 'success', message: t('clients.createSuccess') });
      setTimeout(() => navigate(`/clients/${customer.id}`), 800);
    } catch {
      setToast({ type: 'error', message: t('clients.createError') });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/clients')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">{t('clients.formTitle')}</h1>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label={`${t('clients.name')} *`}
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder={t('clients.namePlaceholder')}
              error={errors.name}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('clients.type')}</label>
                <select
                  value={form.type}
                  onChange={(e) => updateField('type', e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                >
                  <option value="client">{t('clients.client')}</option>
                  <option value="prospect">{t('clients.prospect')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('clients.country')}</label>
                <select
                  value={form.country_code}
                  onChange={(e) => updateField('country_code', e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              label={t('clients.address')}
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('clients.city')}
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
              />
              <Input
                label={t('clients.postalCode')}
                value={form.postal_code}
                onChange={(e) => updateField('postal_code', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('clients.phone')}
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
              <Input
                label={t('clients.email')}
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                error={errors.email}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button type="button" variant="secondary" onClick={() => navigate('/clients')}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={saving}>
                {t('common.save')}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </MainLayout>
  );
}
