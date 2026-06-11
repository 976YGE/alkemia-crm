import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Check, X, Search, Package } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { Toast } from '../../components/ui/Toast';
import { ProductsAdminService } from '../../services/productsAdmin.service';
import { Product, ProductCategory, CountryCode } from '../../types';

const COUNTRIES: CountryCode[] = ['FR', 'ES', 'IT', 'BE', 'CH'];

interface EditingProduct {
  id: string;
  name: string;
  code: string;
  ean: string;
  price: number;
  active: boolean;
}

interface NewProduct {
  code: string;
  name: string;
  ean: string;
  category_id: string;
  country_code: CountryCode;
  price: number;
}

export function ProductsManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState<CountryCode | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editing, setEditing] = useState<EditingProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [newProduct, setNewProduct] = useState<NewProduct>({
    code: '', name: '', ean: '', category_id: '', country_code: 'FR', price: 0,
  });
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        ProductsAdminService.getAllProducts(),
        ProductsAdminService.getAllCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch {
      showToast('error', 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMsg({ type, message });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.ean || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchCountry = countryFilter === 'all' || p.country_code === countryFilter;
      const matchCategory = categoryFilter === 'all' || p.category_id === categoryFilter;
      return matchSearch && matchCountry && matchCategory;
    });
  }, [products, searchQuery, countryFilter, categoryFilter]);

  const startEdit = (product: Product) => {
    setEditing({
      id: product.id,
      name: product.name,
      code: product.code,
      ean: product.ean || '',
      price: product.price,
      active: product.active,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await ProductsAdminService.updateProduct(editing.id, {
        name: editing.name,
        code: editing.code,
        ean: editing.ean || null,
        price: editing.price,
        active: editing.active,
      });
      setEditing(null);
      showToast('success', 'Produit mis à jour');
      await load();
    } catch {
      showToast('error', 'Erreur lors de la mise à jour');
    }
  };

  const saveNew = async () => {
    if (!newProduct.code || !newProduct.name || !newProduct.category_id) {
      showToast('error', 'Le code, le nom et la gamme sont requis');
      return;
    }
    try {
      await ProductsAdminService.createProduct({
        code: newProduct.code.toUpperCase(),
        name: newProduct.name,
        ean: newProduct.ean || null,
        category_id: newProduct.category_id,
        country_code: newProduct.country_code,
        price: newProduct.price,
        active: true,
      });
      setCreating(false);
      setNewProduct({ code: '', name: '', ean: '', category_id: '', country_code: 'FR', price: 0 });
      showToast('success', 'Produit créé');
      await load();
    } catch {
      showToast('error', 'Erreur lors de la création');
    }
  };

  const availableCategories = useMemo(() => {
    const ids = new Set(filteredProducts.map(p => p.category_id));
    return categories.filter(c => ids.has(c.id));
  }, [filteredProducts, categories]);

  if (loading) return <MainLayout><Loading /></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestion des produits</h1>
            <p className="text-slate-500 mt-1">{products.length} produit{products.length > 1 ? 's' : ''} au total</p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau produit
          </Button>
        </div>

        {creating && (
          <Card>
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Nouveau produit</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Code *</label>
                  <Input value={newProduct.code} onChange={e => setNewProduct(p => ({ ...p, code: e.target.value }))} placeholder="REF001" />
                </div>
                <div className="sm:col-span-1 lg:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nom *</label>
                  <Input value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} placeholder="Nom du produit" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">EAN</label>
                  <Input value={newProduct.ean} onChange={e => setNewProduct(p => ({ ...p, ean: e.target.value }))} placeholder="3600..." />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Gamme *</label>
                  <select
                    value={newProduct.category_id}
                    onChange={e => setNewProduct(p => ({ ...p, category_id: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Sélectionner une gamme</option>
                    {categories.map(c => <option key={c.id} value={c.id}>[{c.country_code}] {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Pays</label>
                  <select
                    value={newProduct.country_code}
                    onChange={e => setNewProduct(p => ({ ...p, country_code: e.target.value as CountryCode }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Prix (€)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newProduct.price}
                    onChange={e => setNewProduct(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={saveNew}><Check className="w-4 h-4 mr-1" /> Créer</Button>
                <Button variant="secondary" onClick={() => setCreating(false)}><X className="w-4 h-4 mr-1" /> Annuler</Button>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un produit, code, EAN..."
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={countryFilter}
                onChange={e => setCountryFilter(e.target.value as CountryCode | 'all')}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">Tous les pays</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">Toutes les gammes</option>
                {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.country_code})</option>)}
              </select>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400">Aucun produit trouvé</p>
              </div>
            ) : (
              filteredProducts.map(product => {
                const isEditing = editing?.id === product.id;
                const category = categories.find(c => c.id === product.category_id);

                return (
                  <div key={product.id} className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      {category && (
                        <div
                          className="w-2.5 h-10 rounded-full shrink-0"
                          style={{ backgroundColor: category.primary_color }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900">{product.name}</span>
                          {!product.active && <Badge variant="warning">Inactif</Badge>}
                          <span className="text-xs text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded">{product.code}</span>
                          {product.ean && <span className="text-xs text-slate-400">{product.ean}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {category && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: category.primary_color }} />
                              {category.name}
                            </span>
                          )}
                          <span className="text-xs font-semibold text-slate-600">
                            {product.price.toFixed(2)} {product.country_code === 'CH' ? 'CHF' : '€'}
                          </span>
                          <span className="text-xs text-slate-400 uppercase font-semibold">{product.country_code}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(product)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {isEditing && editing && (
                      <div className="mt-4 ml-5 pl-4 border-l-2 border-brand-100 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Nom</label>
                            <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Code</label>
                            <Input value={editing.code} onChange={e => setEditing({ ...editing, code: e.target.value })} />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">EAN</label>
                            <Input value={editing.ean} onChange={e => setEditing({ ...editing, ean: e.target.value })} placeholder="EAN" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Prix (€)</label>
                            <Input
                              type="number" min="0" step="0.01"
                              value={editing.price}
                              onChange={e => setEditing({ ...editing, price: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`active-${editing.id}`}
                            checked={editing.active}
                            onChange={e => setEditing({ ...editing, active: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300 text-brand-600"
                          />
                          <label htmlFor={`active-${editing.id}`} className="text-sm font-medium text-slate-700">Produit actif</label>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdit}><Check className="w-4 h-4 mr-1" /> Enregistrer</Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditing(null)}><X className="w-4 h-4 mr-1" /> Annuler</Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>
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
