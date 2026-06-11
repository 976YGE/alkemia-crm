import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Server, Plus, CreditCard as Edit2, Trash2, Eye, EyeOff, CheckCircle, TestTube, Clock, X, CalendarClock, Timer } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Loading } from '../../components/ui/Loading';
import { Badge } from '../../components/ui/Badge';
import { SFTPService, type SFTPConfig, type SFTPConfigInput } from '../../services/sftp.service';
import { useAuth } from '../../contexts/AuthContext';
import type { CountryCode } from '../../types/database';

const COUNTRIES: { code: CountryCode; name: string }[] = [
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Espagne' },
  { code: 'IT', name: 'Italie' },
  { code: 'BE', name: 'Belgique' },
  { code: 'CH', name: 'Suisse' },
];

function getNextScheduledTime(scheduleTimes: string[]): string | null {
  if (!scheduleTimes || scheduleTimes.length === 0) return null;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const sortedTimes = [...scheduleTimes].sort();

  for (const time of sortedTimes) {
    const [h, m] = time.split(':').map(Number);
    const timeMinutes = h * 60 + m;
    if (timeMinutes > currentMinutes) {
      return `Aujourd'hui ${time}`;
    }
  }

  return `Demain ${sortedTimes[0]}`;
}

function ScheduleSection({ config, onUpdate }: { config: SFTPConfig; onUpdate: () => void }) {
  const [enabled, setEnabled] = useState(config.schedule_enabled);
  const [times, setTimes] = useState<string[]>(config.schedule_times || ['08:00', '18:00']);
  const [saving, setSaving] = useState(false);
  const [newTime, setNewTime] = useState('');
  const [dirty, setDirty] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setEnabled(checked);
    setDirty(true);
  };

  const addTime = () => {
    if (!newTime || times.includes(newTime)) return;
    const updated = [...times, newTime].sort();
    setTimes(updated);
    setNewTime('');
    setDirty(true);
  };

  const removeTime = (time: string) => {
    if (times.length <= 1) return;
    setTimes(times.filter(t => t !== time));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await SFTPService.updateSchedule(config.id, {
        schedule_enabled: enabled,
        schedule_times: times,
      });
      setDirty(false);
      onUpdate();
    } catch (error) {
      console.error('Error saving schedule:', error);
    } finally {
      setSaving(false);
    }
  };

  const nextRun = enabled ? getNextScheduledTime(times) : null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Planification automatique</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => handleToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
        </label>
      </div>

      {enabled && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            L'import et l'export se lancent automatiquement l'un apres l'autre a chaque horaire configure.
          </p>

          <div className="flex flex-wrap gap-2">
            {times.map((time) => (
              <span
                key={time}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 border border-brand-200 rounded-full text-sm font-medium text-brand-700"
              >
                <Clock className="w-3.5 h-3.5" />
                {time}
                {times.length > 1 && (
                  <button
                    onClick={() => removeTime(time)}
                    className="ml-0.5 hover:text-brand-900 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="px-2 py-1 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <button
              onClick={addTime}
              disabled={!newTime || times.includes(newTime)}
              className="px-3 py-1 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 inline mr-1" />
              Ajouter
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            {config.last_scheduled_run_at && (
              <span className="flex items-center gap-1">
                <Timer className="w-3.5 h-3.5" />
                Derniere exec. auto : {new Date(config.last_scheduled_run_at).toLocaleString('fr-FR')}
              </span>
            )}
            {nextRun && (
              <span className="flex items-center gap-1 text-brand-600">
                <CalendarClock className="w-3.5 h-3.5" />
                Prochaine : {nextRun}
              </span>
            )}
          </div>
        </div>
      )}

      {dirty && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer la planification'}
          </button>
        </div>
      )}
    </div>
  );
}

export function SFTPConfiguration() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [configurations, setConfigurations] = useState<SFTPConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [testing, setTesting] = useState(false);
  const [formData, setFormData] = useState<SFTPConfigInput>({
    country_code: 'FR',
    host: '',
    port: 22,
    username: '',
    password: '',
    import_path: '/import',
    export_path: '/export',
    active: true,
  });

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      const data = await SFTPService.getAllConfigurations();
      setConfigurations(data);
    } catch (error) {
      console.error('Error loading SFTP configurations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await SFTPService.updateConfiguration(editingId, formData);
      } else {
        await SFTPService.createConfiguration(formData);
      }
      await loadConfigurations();
      resetForm();
    } catch (error) {
      console.error('Error saving SFTP configuration:', error);
      alert('Erreur lors de la sauvegarde de la configuration');
    }
  };

  const handleEdit = (config: SFTPConfig) => {
    setEditingId(config.id);
    setFormData({
      country_code: config.country_code,
      host: config.host,
      port: config.port,
      username: config.username,
      password: SFTPService.decryptPassword(config.password_encrypted),
      import_path: config.import_path,
      export_path: config.export_path,
      active: config.active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Etes-vous sur de vouloir supprimer cette configuration ?')) return;
    try {
      await SFTPService.deleteConfiguration(id);
      await loadConfigurations();
    } catch (error) {
      console.error('Error deleting SFTP configuration:', error);
      alert('Erreur lors de la suppression de la configuration');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setFormData({
      country_code: 'FR',
      host: '',
      port: 22,
      username: '',
      password: '',
      import_path: '/import',
      export_path: '/export',
      active: true,
    });
  };

  const handleTestConnection = async () => {
    if (!formData.host || !formData.username || !formData.password) {
      alert('Veuillez remplir tous les champs requis avant de tester la connexion');
      return;
    }

    setTesting(true);
    try {
      const result = await SFTPService.testConnection(formData);
      if (result.success) {
        alert(result.message);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error testing SFTP connection:', error);
      alert('Erreur lors du test de connexion');
    } finally {
      setTesting(false);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (user?.role !== 'super_admin') {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-slate-600">Acces non autorise</p>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <Loading text="Chargement..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Server className="w-8 h-8 text-slate-700 mr-3" />
            <h1 className="text-2xl font-bold text-slate-900">Configuration SFTP</h1>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle configuration
            </Button>
          )}
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? 'Modifier' : 'Nouvelle'} configuration SFTP</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Pays
                    </label>
                    <select
                      value={formData.country_code}
                      onChange={(e) => setFormData({ ...formData, country_code: e.target.value as CountryCode })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      required
                    >
                      {COUNTRIES.map(country => (
                        <option key={country.code} value={country.code}>
                          {country.name} ({country.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Hote (IP ou domaine)
                    </label>
                    <Input
                      type="text"
                      value={formData.host}
                      onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      placeholder="sftp.example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Port
                    </label>
                    <Input
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nom d'utilisateur
                    </label>
                    <Input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="username"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Mot de passe
                    </label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      required={!editingId}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Chemin d'importation
                    </label>
                    <Input
                      type="text"
                      value={formData.import_path}
                      onChange={(e) => setFormData({ ...formData, import_path: e.target.value })}
                      placeholder="/import"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Chemin d'exportation
                    </label>
                    <Input
                      type="text"
                      value={formData.export_path}
                      onChange={(e) => setFormData({ ...formData, export_path: e.target.value })}
                      placeholder="/export"
                      required
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                      />
                      <span className="ml-2 text-sm text-slate-700">Configuration active</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {editingId ? 'Mettre a jour' : 'Creer'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleTestConnection}
                    disabled={testing}
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    {testing ? 'Test en cours...' : 'Tester la connexion'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={resetForm}>
                    Annuler
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4">
          {configurations.map((config) => (
            <Card key={config.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {COUNTRIES.find(c => c.code === config.country_code)?.name} ({config.country_code})
                      </h3>
                      {config.active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="default">Inactive</Badge>
                      )}
                      {config.schedule_enabled && (
                        <Badge variant="warning">
                          <Timer className="w-3 h-3 mr-1" />
                          Auto
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-600">Hote:</span>{' '}
                        <span className="font-medium text-slate-900">{config.host}:{config.port}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Utilisateur:</span>{' '}
                        <span className="font-medium text-slate-900">{config.username}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">Mot de passe:</span>
                        <span className="font-mono text-slate-900">
                          {showPassword[config.id]
                            ? SFTPService.decryptPassword(config.password_encrypted)
                            : '••••••••'
                          }
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(config.id)}
                          className="text-slate-500 hover:text-slate-700"
                        >
                          {showPassword[config.id] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <div>
                        <span className="text-slate-600">Import:</span>{' '}
                        <span className="font-mono text-slate-900">{config.import_path}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Export:</span>{' '}
                        <span className="font-mono text-slate-900">{config.export_path}</span>
                      </div>
                      {config.last_sync_at && (
                        <div>
                          <span className="text-slate-600">Derniere synchro:</span>{' '}
                          <span className="text-slate-900">
                            {new Date(config.last_sync_at).toLocaleString('fr-FR')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(config)}
                      className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <ScheduleSection config={config} onUpdate={loadConfigurations} />
              </CardContent>
            </Card>
          ))}

          {configurations.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Server className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">Aucune configuration SFTP</p>
                <p className="text-sm text-slate-500 mt-1">
                  Ajoutez votre premiere configuration pour synchroniser les donnees
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
