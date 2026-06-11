import { useState, useEffect } from 'react';
import { CalendarOff, Search, AlertTriangle, CheckCircle, Calendar, User, ChevronDown } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AnimatorOption {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  country_code: string;
}

interface PreviewAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  store_name: string;
  store_city: string | null;
  country_code: string;
}

export function BulkMarkReported() {
  const [animators, setAnimators] = useState<AnimatorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnimatorId, setSelectedAnimatorId] = useState('');
  const [cutoffDate, setCutoffDate] = useState('');
  const [animatorSearch, setAnimatorSearch] = useState('');
  const [animatorDropdownOpen, setAnimatorDropdownOpen] = useState(false);

  const [preview, setPreview] = useState<PreviewAppointment[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [hasPreview, setHasPreview] = useState(false);

  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadAnimators();
  }, []);

  useEffect(() => {
    if (!animatorDropdownOpen) return;
    const handleClick = () => setAnimatorDropdownOpen(false);
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [animatorDropdownOpen]);

  const loadAnimators = async () => {
    try {
      const { data, error } = await supabase
        .from('user_codes')
        .select('id, code, first_name, last_name, country_code')
        .order('last_name', { ascending: true });

      if (error) throw error;
      setAnimators(data || []);
    } catch (err) {
      console.error('Error loading animators:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedAnimator = animators.find(a => a.id === selectedAnimatorId);

  const filteredAnimators = animators.filter(a => {
    if (!animatorSearch) return true;
    const q = animatorSearch.toLowerCase();
    return (
      a.first_name.toLowerCase().includes(q) ||
      a.last_name.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q)
    );
  });

  const handlePreview = async () => {
    if (!selectedAnimatorId || !cutoffDate) return;

    setPreviewLoading(true);
    setResult(null);
    setHasPreview(false);

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, appointment_date, appointment_time, store_name, store_city, country_code')
        .eq('user_code_id', selectedAnimatorId)
        .lt('appointment_date', cutoffDate)
        .eq('report_not_required', false)
        .neq('appointment_type', 'formation')
        .order('appointment_date', { ascending: false });

      if (error) throw error;

      const appointmentIds = (data || []).map(a => a.id);
      let reportedIds = new Set<string>();

      if (appointmentIds.length > 0) {
        const chunks = [];
        for (let i = 0; i < appointmentIds.length; i += 100) {
          chunks.push(appointmentIds.slice(i, i + 100));
        }
        for (const chunk of chunks) {
          const { data: reports } = await supabase
            .from('sales_reports')
            .select('appointment_id')
            .in('appointment_id', chunk);
          if (reports) {
            reports.forEach(r => reportedIds.add(r.appointment_id));
          }
        }
      }

      const unreported = (data || []).filter(a => !reportedIds.has(a.id));
      setPreview(unreported);
      setHasPreview(true);
    } catch (err) {
      console.error('Error previewing:', err);
      setResult({ type: 'error', text: 'Erreur lors de la recherche des rendez-vous' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApply = async () => {
    if (preview.length === 0) return;

    setApplying(true);
    setResult(null);

    try {
      const ids = preview.map(a => a.id);
      const chunks = [];
      for (let i = 0; i < ids.length; i += 100) {
        chunks.push(ids.slice(i, i + 100));
      }

      let totalUpdated = 0;
      for (const chunk of chunks) {
        const { error, count } = await supabase
          .from('appointments')
          .update({ report_not_required: true })
          .in('id', chunk)
          .select('id', { count: 'exact', head: true });

        if (error) throw error;
        totalUpdated += count || chunk.length;
      }

      setResult({
        type: 'success',
        text: `${totalUpdated} rendez-vous marque${totalUpdated > 1 ? 's' : ''} comme deja renseigne${totalUpdated > 1 ? 's' : ''}`,
      });
      setPreview([]);
      setHasPreview(false);
    } catch (err) {
      console.error('Error applying:', err);
      setResult({ type: 'error', text: 'Erreur lors de la mise a jour' });
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Loading />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Initialisation des comptes rendus</h1>
          <p className="text-slate-600 mt-1">
            Marquez les rendez-vous anterieurs comme deja renseignes pour qu'ils ne figurent plus dans "A saisir"
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Outil de migration</p>
                  <p>
                    Cet outil est prevu pour etre utilise avant la premiere utilisation de la plateforme par un animateur.
                    Les rendez-vous marques n'apparaitront plus dans la liste "A saisir".
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Animateur
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setAnimatorDropdownOpen(!animatorDropdownOpen);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left bg-white border border-slate-300 rounded-lg hover:border-slate-400 transition-colors text-sm"
                  >
                    {selectedAnimator ? (
                      <span className="text-slate-900">
                        {selectedAnimator.first_name} {selectedAnimator.last_name}
                        <span className="text-slate-400 ml-2">({selectedAnimator.code})</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">Selectionner un animateur...</span>
                    )}
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>

                  {animatorDropdownOpen && (
                    <div
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-72 overflow-hidden"
                    >
                      <div className="p-2 border-b border-slate-100">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={animatorSearch}
                            onChange={(e) => setAnimatorSearch(e.target.value)}
                            placeholder="Rechercher..."
                            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="overflow-y-auto max-h-52">
                        {filteredAnimators.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-slate-400">Aucun resultat</p>
                        ) : (
                          filteredAnimators.map((a) => (
                            <button
                              key={a.id}
                              onClick={() => {
                                setSelectedAnimatorId(a.id);
                                setAnimatorDropdownOpen(false);
                                setAnimatorSearch('');
                                setHasPreview(false);
                                setPreview([]);
                                setResult(null);
                              }}
                              className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors ${
                                a.id === selectedAnimatorId ? 'bg-brand-50 text-brand-700' : 'text-slate-700'
                              }`}
                            >
                              <span>
                                {a.first_name} {a.last_name}
                                <span className="text-slate-400 ml-2">({a.code})</span>
                              </span>
                              <Badge>{a.country_code}</Badge>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date limite (exclue)
                </label>
                <Input
                  type="date"
                  value={cutoffDate}
                  onChange={(e) => {
                    setCutoffDate(e.target.value);
                    setHasPreview(false);
                    setPreview([]);
                    setResult(null);
                  }}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Tous les rendez-vous avant cette date seront concernes
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handlePreview}
                disabled={!selectedAnimatorId || !cutoffDate || previewLoading}
              >
                {previewLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Rechercher les rendez-vous
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <div
            className={`p-4 rounded-lg border ${
              result.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <div className="flex items-center gap-3">
              {result.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              )}
              <p className="text-sm font-medium">{result.text}</p>
            </div>
          </div>
        )}

        {hasPreview && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {preview.length === 0
                    ? 'Aucun rendez-vous a marquer'
                    : `${preview.length} rendez-vous a marquer`}
                </CardTitle>
                {preview.length > 0 && (
                  <Button
                    variant="primary"
                    onClick={handleApply}
                    disabled={applying}
                  >
                    {applying ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <CalendarOff className="w-4 h-4 mr-2" />
                    )}
                    Marquer comme renseignes
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {preview.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle className="w-12 h-12" />}
                  title="Tout est a jour"
                  description="Tous les rendez-vous passes de cet animateur avant cette date ont deja un compte rendu ou sont deja marques"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Heure</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Point de vente</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Ville</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Pays</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 100).map((apt) => (
                        <tr key={apt.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm text-slate-900">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {format(new Date(apt.appointment_date + 'T00:00:00'), 'dd/MM/yyyy')}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {apt.appointment_time.slice(0, 5)}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-slate-900">
                            {apt.store_name}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {apt.store_city || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge>{apt.country_code}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 100 && (
                    <p className="text-sm text-slate-500 text-center py-3">
                      ... et {preview.length - 100} autres rendez-vous
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
