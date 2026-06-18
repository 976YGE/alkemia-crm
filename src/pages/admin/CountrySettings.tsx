import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Camera, Save } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { Toast } from '../../components/ui/Toast';
import { supabase } from '../../lib/supabase';

interface CountryConfig {
  id: string;
  code: string;
  name: string;
  proof_photo_required: boolean;
}

export function CountrySettings() {
  const { t } = useTranslation();
  const [countries, setCountries] = useState<CountryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadCountries();
  }, []);

  async function loadCountries() {
    const { data, error } = await supabase
      .from('countries')
      .select('id, code, name, proof_photo_required')
      .eq('active', true)
      .order('name');

    if (error) {
      setToast({ message: error.message, type: 'error' });
    } else {
      setCountries(data || []);
    }
    setLoading(false);
  }

  function toggleProofPhoto(code: string) {
    setCountries(prev =>
      prev.map(c => c.code === code ? { ...c, proof_photo_required: !c.proof_photo_required } : c)
    );
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      for (const country of countries) {
        const { error } = await supabase
          .from('countries')
          .update({ proof_photo_required: country.proof_photo_required })
          .eq('id', country.id);
        if (error) throw error;
      }
      setToast({ message: t('countrySettings.saved'), type: 'success' });
      setDirty(false);
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'Error', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <MainLayout><Loading /></MainLayout>;

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-7 h-7 text-slate-700" />
            <h1 className="text-2xl font-bold text-slate-900">{t('countrySettings.title')}</h1>
          </div>
          {dirty && (
            <Button onClick={handleSave} loading={saving}>
              <Save className="w-4 h-4 mr-2" />
              {t('countrySettings.save')}
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              {t('countrySettings.proofPhotoSection')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-4">{t('countrySettings.proofPhotoDescription')}</p>
            <div className="space-y-3">
              {countries.map(country => (
                <div
                  key={country.code}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-medium text-slate-900">{country.name}</span>
                    <span className="text-sm text-slate-500">({country.code})</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={country.proof_photo_required}
                      onChange={() => toggleProofPhoto(country.code)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-3 text-sm font-medium text-slate-700">
                      {country.proof_photo_required ? t('countrySettings.required') : t('countrySettings.optional')}
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
