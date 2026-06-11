import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save, Check, Search, Plus, Minus, Upload, FileText, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr, es, it } from 'date-fns/locale';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Loading } from '../../components/ui/Loading';
import { Toast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { useProductsStore } from '../../store/productsStore';
import { AppointmentsService } from '../../services/appointments.service';
import { SalesService } from '../../services/sales.service';
import { NotificationsService } from '../../services/notifications.service';
import type { AppointmentWithReport, ProductWithQuantity } from '../../types';

const locales = { fr, es, it };

export function SalesReportForm() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isEditMode = window.location.pathname.includes('/edit/');

  const { categories, loadProducts, loading: productsLoading } = useProductsStore();

  const [appointment, setAppointment] = useState<AppointmentWithReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [comment, setComment] = useState('');
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [calculatedAmount, setCalculatedAmount] = useState(0);
  const [reportId, setReportId] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [existingProofFilePath, setExistingProofFilePath] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [appointmentId, user]);

  useEffect(() => {
    const calculated = Object.entries(productQuantities).reduce((sum, [productId, quantity]) => {
      const product = categories
        .flatMap(c => c.products)
        .find(p => p.id === productId);
      return sum + (product?.price || 0) * quantity;
    }, 0);
    setCalculatedAmount(calculated);
  }, [productQuantities, categories]);

  const totalQuantity = Object.values(productQuantities).reduce((sum, q) => sum + q, 0);

  const loadData = async () => {
    if (!appointmentId || !user) return;

    try {
      const apt = await AppointmentsService.getAppointmentById(appointmentId);
      if (!apt) {
        setError('Appointment not found');
        setLoading(false);
        return;
      }

      if (apt.store_name?.toUpperCase() === 'INCONNUE') {
        navigate(`/agenda/${appointmentId}`);
        return;
      }

      if (isEditMode) {
        if (!apt.sales_report) {
          setError('No report found');
          setLoading(false);
          return;
        }

        if (apt.sales_report.status !== 'draft') {
          setError(t('sales.cannotModify'));
          setLoading(false);
          return;
        }

        setReportId(apt.sales_report.id);
        setTotalAmount(apt.sales_report.total_amount.toString());
        setComment(apt.sales_report.comment || '');
        setExistingProofFilePath(apt.sales_report.proof_file_path || null);

        const report = await SalesService.getSalesReportById(apt.sales_report.id);
        if (report?.lines) {
          const quantities: Record<string, number> = {};
          report.lines.forEach(line => {
            quantities[line.product_id] = line.quantity;
          });
          setProductQuantities(quantities);
        }
      } else {
        if (!apt.can_report) {
          setError(t('sales.appointmentNotPast'));
          setLoading(false);
          return;
        }
      }

      setAppointment(apt);
      await loadProducts(apt.country_code);

      setExpandedCategories(new Set<string>());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setProductQuantities(prev => {
      const current = prev[productId] || 0;
      const newValue = Math.max(0, current + delta);
      if (newValue === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: newValue };
    });
  };

  const setQuantity = (productId: string, value: number) => {
    if (value <= 0) {
      const { [productId]: _, ...rest } = productQuantities;
      setProductQuantities(rest);
    } else {
      setProductQuantities(prev => ({ ...prev, [productId]: value }));
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleSave = async (status: 'draft' | 'validated') => {
    setError('');

    const totalAmountNum = parseFloat(totalAmount);
    if (!totalAmount || isNaN(totalAmountNum) || totalAmountNum <= 0) {
      setError(t('sales.totalAmountRequired'));
      return;
    }

    if (!proofFile && !existingProofFilePath) {
      setError(t('sales.proofFileRequired'));
      return;
    }

    const lines = Object.entries(productQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => {
        const product = categories
          .flatMap(c => c.products)
          .find(p => p.id === productId);
        return {
          product_id: productId,
          quantity,
          unit_price: product?.price || 0
        };
      });

    if (lines.length === 0) {
      setError(t('sales.atLeastOneProduct'));
      return;
    }

    if (status === 'validated') {
      const confirmMessage = t('sales.confirmValidation');
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    setSaving(true);

    try {
      let savedReportId: string | null = null;

      if (isEditMode && reportId) {
        await SalesService.updateSalesReport({
          id: reportId,
          appointment_id: appointmentId!,
          user_id: user!.id,
          country_code: user!.country_code,
          total_amount: totalAmountNum,
          comment: comment || undefined,
          status,
          proofFile: proofFile || undefined,
          existingProofFilePath: existingProofFilePath || undefined,
          lines
        });
        savedReportId = reportId;
      } else {
        const created = await SalesService.createSalesReport({
          appointment_id: appointmentId!,
          user_id: user!.id,
          country_code: user!.country_code,
          total_amount: totalAmountNum,
          comment: comment || undefined,
          status,
          proofFile: proofFile || undefined,
          lines
        });
        savedReportId = created?.id || null;
      }

      if (status === 'validated' && savedReportId) {
        NotificationsService.triggerCrSummaryNotification(savedReportId);
      }

      navigate('/agenda');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = searchQuery
    ? categories.map(cat => ({
        ...cat,
        products: cat.products.filter(p => {
          const query = searchQuery.toLowerCase();
          return (
            p.name.toLowerCase().includes(query) ||
            p.code.toLowerCase().includes(query) ||
            (p.ean && p.ean.toLowerCase().includes(query))
          );
        })
      })).filter(cat => cat.products.length > 0)
    : categories;

  const locale = locales[i18n.language as keyof typeof locales] || fr;

  if (loading || productsLoading) {
    return (
      <MainLayout>
        <Loading text={t('common.loading')} />
      </MainLayout>
    );
  }

  if (error && !appointment) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => navigate('/agenda')}>
            {t('common.back')}
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl mx-auto pb-8">
        <div className="flex items-center">
          <button
            onClick={() => navigate(`/agenda/${appointmentId}`)}
            className="mr-4 p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isEditMode ? t('agenda.editReport') : t('sales.title')}
            </h1>
            {appointment && (
              <p className="text-sm text-slate-600 mt-1">
                {appointment.store_name} - {format(parseISO(appointment.appointment_date), 'd MMMM yyyy', { locale })}
              </p>
            )}
          </div>
        </div>

        {error && (
          <Toast
            message={error}
            type="error"
            onClose={() => setError('')}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('sales.products')}</CardTitle>
            <div className="mt-2">
              <Input
                type="text"
                placeholder={t('sales.searchProducts')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-5 h-5 text-slate-400" />}
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {filteredCategories.map((categoryGroup) => {
              const isExpanded = expandedCategories.has(categoryGroup.category.id);
              const categoryTotal = categoryGroup.products.reduce((sum, p) => {
                const qty = productQuantities[p.id] || 0;
                return sum + qty;
              }, 0);

              return (
                <div key={categoryGroup.category.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleCategory(categoryGroup.category.id)}
                    className="w-full px-4 py-3 flex items-center justify-between transition-colors"
                    style={{
                      background: `linear-gradient(135deg, ${categoryGroup.category.primary_color}15 0%, ${categoryGroup.category.primary_color}05 100%)`,
                      borderLeft: `4px solid ${categoryGroup.category.primary_color}`
                    }}
                  >
                    <div className="flex items-center">
                      <div
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: categoryGroup.category.primary_color }}
                      />
                      <span className="font-semibold text-slate-900">
                        {categoryGroup.category.name}
                      </span>
                      {categoryTotal > 0 && (
                        <span className="ml-2 text-sm text-slate-600">
                          ({categoryTotal})
                        </span>
                      )}
                    </div>
                    <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="divide-y divide-gray-100">
                      {categoryGroup.products.map((product) => {
                        const quantity = productQuantities[product.id] || 0;
                        return (
                          <div key={product.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 break-words leading-snug">{product.name}</p>
                                <div className="mt-1 space-y-0.5">
                                  <p className="text-sm text-slate-600">
                                    {product.price.toFixed(2)} {user?.country_code === 'CH' ? 'CHF' : '€'}
                                  </p>
                                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                                    <span className="font-mono">SKU: {product.code}</span>
                                    {product.ean && (
                                      <span className="font-mono">EAN: {product.ean}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-end md:justify-start md:flex-shrink-0">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => updateQuantity(product.id, -1)}
                                    disabled={quantity === 0}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    value={quantity || ''}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      setQuantity(product.id, val);
                                    }}
                                    className="w-14 text-center px-1 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                                  />
                                  <button
                                    onClick={() => updateQuantity(product.id, 1)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                                    style={{
                                      backgroundColor: `${categoryGroup.category.primary_color}20`,
                                    }}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('sales.totalAmount')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="bg-brand-50 border border-brand-200 rounded-lg p-3">
                <p className="text-sm font-medium text-brand-900 mb-1">CA Calculé</p>
                <p className="text-2xl font-bold text-brand-600">
                  {calculatedAmount.toFixed(2)} {user?.country_code === 'CH' ? 'CHF' : '€'}
                </p>
                <p className="text-sm text-brand-700 mt-1">{totalQuantity} article{totalQuantity > 1 ? 's' : ''}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  CA Global
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="text-lg font-semibold"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('sales.comment')}</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
              rows={3}
              placeholder={t('sales.commentPlaceholder')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {t('sales.proofFile')} <span className="text-red-500">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(proofFile || existingProofFilePath) && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-600" />
                    <span className="text-sm text-slate-900">
                      {proofFile ? proofFile.name : t('sales.existingProofFile')}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setProofFile(null);
                      if (!isEditMode) {
                        setExistingProofFilePath(null);
                      }
                    }}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              )}
              <label className="block">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setProofFile(file);
                    }
                  }}
                  className="hidden"
                  id="proof-file-input"
                />
                <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-brand-500 hover:bg-brand-50 transition-colors cursor-pointer">
                  <Upload className="w-5 h-5 text-slate-600" />
                  <span className="text-sm text-slate-600">
                    {proofFile || existingProofFilePath ? t('sales.changeProofFile') : t('sales.uploadProofFile')}
                  </span>
                </div>
              </label>
              <p className="text-xs text-slate-500">
                {t('sales.proofFileHint')}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="bg-white border-t border-slate-200 p-4 -mx-4 sm:mx-0 sm:border-0 sm:p-0 mt-8">
          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => handleSave('draft')}
              loading={saving}
              disabled={saving}
            >
              <Save className="w-5 h-5 mr-2" />
              {t('sales.saveDraft')}
            </Button>
            <Button
              fullWidth
              onClick={() => handleSave('validated')}
              loading={saving}
              disabled={saving}
            >
              <Check className="w-5 h-5 mr-2" />
              {t('sales.validate')}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
