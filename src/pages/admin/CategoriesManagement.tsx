import { useState, useEffect } from 'react';
import { Plus, Pencil, Check, X, Layers, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { Toast } from '../../components/ui/Toast';
import { ProductsAdminService, CategoryWithProductCount } from '../../services/productsAdmin.service';
import { CountryCode, ProductCategory } from '../../types';

const COUNTRIES: CountryCode[] = ['FR', 'ES', 'IT', 'BE', 'CH'];

const PRESET_COLORS = [
  '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#ec4899', '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#64748b', '#6b7280', '#374151', '#1e293b', '#0f172a',
];

interface EditingCategory {
  id: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  display_order: number;
  active: boolean;
}

interface NewCategory {
  code: string;
  name: string;
  country_code: CountryCode;
  primary_color: string;
  secondary_color: string;
  display_order: number;
}

export function CategoriesManagement() {
  const [categories, setCategories] = useState<CategoryWithProductCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingCategory | null>(null);
  const [creating, setCreating] = useState(false);
  const [newCategory, setNewCategory] = useState<NewCategory>({
    code: '', name: '', country_code: 'FR', primary_color: '#3b82f6', secondary_color: '', display_order: 0
  });
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [countryFilter, setCountryFilter] = useState<CountryCode | 'all'>('all');
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set(COUNTRIES));

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await ProductsAdminService.getAllCategories();
      setCategories(data);
    } catch {
      showToast('error', 'Erreur lors du chargement des gammes');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMsg({ type, message });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const startEdit = (cat: CategoryWithProductCount) => {
    setEditing({
      id: cat.id,
      name: cat.name,
      primary_color: cat.primary_color,
      secondary_color: cat.secondary_color || '',
      display_order: cat.display_order,
      active: cat.active,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await ProductsAdminService.updateCategory(editing.id, {
        name: editing.name,
        primary_color: editing.primary_color,
        secondary_color: editing.secondary_color || null,
        display_order: editing.display_order,
        active: editing.active,
      });
      setEditing(null);
      showToast('success', 'Gamme mise à jour');
      await load();
    } catch {
      showToast('error', 'Erreur lors de la mise à jour');
    }
  };

  const saveNew = async () => {
    if (!newCategory.code || !newCategory.name) {
      showToast('error', 'Le code et le nom sont requis');
      return;
    }
    try {
      await ProductsAdminService.createCategory({
        code: newCategory.code.toUpperCase(),
        name: newCategory.name,
        country_code: newCategory.country_code,
        primary_color: newCategory.primary_color,
        secondary_color: newCategory.secondary_color || null,
        display_order: newCategory.display_order,
        active: true,
      });
      setCreating(false);
      setNewCategory({ code: '', name: '', country_code: 'FR', primary_color: '#3b82f6', secondary_color: '', display_order: 0 });
      showToast('success', 'Gamme créée');
      await load();
    } catch {
      showToast('error', 'Erreur lors de la création');
    }
  };

  const toggleCountry = (country: string) => {
    setExpandedCountries(prev => {
      const next = new Set(prev);
      if (next.has(country)) next.delete(country);
      else next.add(country);
      return next;
    });
  };

  const grouped = COUNTRIES.reduce((acc, country) => {
    acc[country] = categories.filter(c => c.country_code === country);
    return acc;
  }, {} as Record<string, CategoryWithProductCount[]>);

  const filteredCountries = countryFilter === 'all' ? COUNTRIES : [countryFilter];

  if (loading) return <MainLayout><Loading /></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestion des gammes</h1>
            <p className="text-slate-500 mt-1">{categories.length} gamme{categories.length > 1 ? 's' : ''} au total</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={countryFilter}
              onChange={e => setCountryFilter(e.target.value as CountryCode | 'all')}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">Tous les pays</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <Button onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle gamme
            </Button>
          </div>
        </div>

        {creating && (
          <Card>
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Nouvelle gamme</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
                  <Input
                    value={newCategory.code}
                    onChange={e => setNewCategory(p => ({ ...p, code: e.target.value }))}
                    placeholder="ex: HYDRAT"
                    className="uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                  <Input
                    value={newCategory.name}
                    onChange={e => setNewCategory(p => ({ ...p, name: e.target.value }))}
                    placeholder="ex: Hydratation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pays</label>
                  <select
                    value={newCategory.country_code}
                    onChange={e => setNewCategory(p => ({ ...p, country_code: e.target.value as CountryCode }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ColorPickerField
                  label="Couleur principale *"
                  value={newCategory.primary_color}
                  onChange={v => setNewCategory(p => ({ ...p, primary_color: v }))}
                />
                <ColorPickerField
                  label="Couleur secondaire"
                  value={newCategory.secondary_color}
                  onChange={v => setNewCategory(p => ({ ...p, secondary_color: v }))}
                  optional
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={saveNew}><Check className="w-4 h-4 mr-1" /> Créer</Button>
                <Button variant="secondary" onClick={() => setCreating(false)}><X className="w-4 h-4 mr-1" /> Annuler</Button>
              </div>
            </div>
          </Card>
        )}

        {filteredCountries.map(country => {
          const cats = grouped[country] || [];
          const isExpanded = expandedCountries.has(country);

          return (
            <div key={country} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <button
                onClick={() => toggleCountry(country)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-xs font-bold text-slate-700 uppercase">{country}</span>
                  <span className="font-semibold text-slate-900">{cats.length} gamme{cats.length > 1 ? 's' : ''}</span>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100">
                  {cats.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 text-sm">Aucune gamme pour ce pays</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {cats.map(cat => (
                        <div key={cat.id} className="px-5 py-4">
                          {editing?.id === cat.id ? (
                            <EditRow
                              editing={editing}
                              onChange={setEditing}
                              onSave={saveEdit}
                              onCancel={() => setEditing(null)}
                            />
                          ) : (
                            <CategoryRow cat={cat} onEdit={() => startEdit(cat)} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {toastMsg && (
        <Toast
          type={toastMsg.type}
          message={toastMsg.message}
          onClose={() => setToastMsg(null)}
        />
      )}
    </MainLayout>
  );
}

function CategoryRow({ cat, onEdit }: { cat: CategoryWithProductCount; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-4">
      <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex gap-1.5 shrink-0">
          <div
            className="w-6 h-6 rounded-md border border-white ring-1 ring-gray-200"
            style={{ backgroundColor: cat.primary_color }}
            title={`Couleur principale: ${cat.primary_color}`}
          />
          {cat.secondary_color && (
            <div
              className="w-6 h-6 rounded-md border border-white ring-1 ring-gray-200"
              style={{ backgroundColor: cat.secondary_color }}
              title={`Couleur secondaire: ${cat.secondary_color}`}
            />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 truncate">{cat.name}</span>
            {!cat.active && <Badge variant="warning">Inactive</Badge>}
          </div>
          <span className="text-xs text-slate-400 font-mono">{cat.code}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Layers className="w-4 h-4" />
          <span className="text-sm">{cat.product_count}</span>
        </div>
        <span className="text-xs text-slate-400">ordre: {cat.display_order}</span>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function EditRow({ editing, onChange, onSave, onCancel }: {
  editing: EditingCategory;
  onChange: (v: EditingCategory) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Nom</label>
          <Input
            value={editing.name}
            onChange={e => onChange({ ...editing, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Ordre d'affichage</label>
          <Input
            type="number"
            value={editing.display_order}
            onChange={e => onChange({ ...editing, display_order: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editing.active}
              onChange={e => onChange({ ...editing, active: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-brand-600"
            />
            <span className="text-sm font-medium text-slate-700">Active</span>
          </label>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ColorPickerField
          label="Couleur principale"
          value={editing.primary_color}
          onChange={v => onChange({ ...editing, primary_color: v })}
        />
        <ColorPickerField
          label="Couleur secondaire"
          value={editing.secondary_color}
          onChange={v => onChange({ ...editing, secondary_color: v })}
          optional
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave}><Check className="w-4 h-4 mr-1" /> Enregistrer</Button>
        <Button size="sm" variant="secondary" onClick={onCancel}><X className="w-4 h-4 mr-1" /> Annuler</Button>
      </div>
    </div>
  );
}

function ColorPickerField({ label, value, onChange, optional }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg border border-slate-300 shrink-0"
            style={{ backgroundColor: value || '#e5e7eb' }}
          />
          <Input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={optional ? 'Optionnel' : '#000000'}
            className="font-mono text-sm"
          />
          <input
            type="color"
            value={value || '#000000'}
            onChange={e => onChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-slate-300"
            title="Sélectionner une couleur"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {optional && (
            <button
              onClick={() => onChange('')}
              className="w-6 h-6 rounded border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-slate-400 transition-colors"
              title="Supprimer la couleur"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          {PRESET_COLORS.map(color => (
            <button
              key={color}
              onClick={() => onChange(color)}
              className={`w-6 h-6 rounded transition-all ${value === color ? 'ring-2 ring-offset-1 ring-brand-500 scale-110' : 'hover:scale-110'}`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
