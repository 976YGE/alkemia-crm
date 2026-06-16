import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CreditCard as Edit2, FileText, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr, es, it } from 'date-fns/locale';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { SalesService } from '../../services/sales.service';
import { useAuth } from '../../contexts/AuthContext';
import type { SalesReport } from '../../types';

const locales = { fr, es, it };

export function SalesReportView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [proofFileUrl, setProofFileUrl] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    if (!id) return;

    try {
      const data = await SalesService.getSalesReportById(id);
      setReport(data);

      if (data?.proof_file_path) {
        try {
          const url = await SalesService.getProofFileUrl(data.proof_file_path);
          setProofFileUrl(url);
        } catch (error) {
          console.error('Error loading proof file:', error);
        }
      }
    } catch (error) {
      console.error('Error loading sales report:', error);
    } finally {
      setLoading(false);
    }
  };

  const locale = locales[i18n.language as keyof typeof locales] || fr;

  if (loading) {
    return (
      <MainLayout>
        <Loading text={t('common.loading')} />
      </MainLayout>
    );
  }

  if (!report) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-slate-600">{t('common.error')}</p>
          <Button onClick={() => navigate('/agenda')} className="mt-4">
            {t('common.back')}
          </Button>
        </div>
      </MainLayout>
    );
  }

  const calculatedTotal = report.lines?.reduce((sum, line) => sum + line.line_amount, 0) || 0;
  const totalQuantity = report.lines?.reduce((sum, line) => sum + line.quantity, 0) || 0;

  const categorizedLines = report.lines?.reduce((acc, line) => {
    if (!line.product?.category) return acc;
    const categoryName = line.product.category.name;
    if (!acc[categoryName]) {
      acc[categoryName] = {
        category: line.product.category,
        lines: []
      };
    }
    acc[categoryName].lines.push(line);
    return acc;
  }, {} as Record<string, { category: any; lines: any[] }>) || {};

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl mx-auto pb-20 md:pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/agenda')}
              className="mr-4 p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t('sales.title')}</h1>
              {report.appointment && (
                <p className="text-sm text-slate-600 mt-1">
                  {report.appointment.store_name} -{' '}
                  {format(parseISO(report.appointment.appointment_date), 'd MMMM yyyy', { locale })}
                </p>
              )}
            </div>
          </div>
          <div>
            {report.status === 'validated' && (
              <Badge variant="success">{t('sales.validated')}</Badge>
            )}
            {report.status === 'draft' && (
              <Badge variant="warning">{t('sales.draft')}</Badge>
            )}
            {report.exported && (
              <Badge variant="info" className="ml-2">{t('sales.exported')}</Badge>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('sales.totalAmount')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">CA Global</p>
                <p className="text-3xl font-bold text-slate-900">
                  {report.total_amount.toFixed(2)} {user?.country_code === 'CH' ? 'CHF' : '€'}
                </p>
                <p className="text-sm text-slate-500 mt-1">{totalQuantity} article{totalQuantity > 1 ? 's' : ''}</p>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-slate-600 mb-1">CA Calculé</p>
                <p className="text-3xl font-bold text-brand-600">
                  {calculatedTotal.toFixed(2)} {user?.country_code === 'CH' ? 'CHF' : '€'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {report.comment && (
          <Card>
            <CardHeader>
              <CardTitle>{t('sales.comment')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 whitespace-pre-wrap">{report.comment}</p>
            </CardContent>
          </Card>
        )}

        {report.proof_file_path && (
          <Card>
            <CardHeader>
              <CardTitle>{t('sales.proofFile')}</CardTitle>
            </CardHeader>
            <CardContent>
              {proofFileUrl ? (
                <div className="space-y-3">
                  {report.proof_file_path.toLowerCase().endsWith('.pdf') ? (
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-red-600" />
                        <div>
                          <p className="font-medium text-slate-900">Document PDF</p>
                          <p className="text-sm text-slate-600">{t('sales.proofFile')}</p>
                        </div>
                      </div>
                      <a
                        href={proofFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="text-sm font-medium">Ouvrir</span>
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <img
                        src={proofFileUrl}
                        alt={t('sales.proofFile')}
                        className="w-full rounded-lg border border-slate-200"
                      />
                      <a
                        href={proofFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="text-sm font-medium">Ouvrir en taille réelle</span>
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-600">Chargement du fichier...</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('sales.products')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(categorizedLines).map(([categoryName, { category, lines }]) => (
              <div key={categoryName} className="border border-slate-200 rounded-lg overflow-hidden">
                <div
                  className="px-4 py-3"
                  style={{
                    background: `linear-gradient(135deg, ${category.primary_color}15 0%, ${category.primary_color}05 100%)`,
                    borderLeft: `4px solid ${category.primary_color}`
                  }}
                >
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ backgroundColor: category.primary_color }}
                    />
                    <span className="font-semibold text-slate-900">{categoryName}</span>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {lines.map((line) => (
                    <div key={line.id} className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 break-words leading-snug">{line.product.name}</p>
                        <div className="mt-1 space-y-0.5">
                          <p className="text-sm text-slate-600">
                            {line.unit_price.toFixed(2)} {user?.country_code === 'CH' ? 'CHF' : '€'} × {line.quantity}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                            <span className="font-mono">SKU: {line.product.code}</span>
                            {line.product.ean && (
                              <span className="font-mono">EAN: {line.product.ean}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="font-semibold text-slate-900 flex-shrink-0">
                        {line.line_amount.toFixed(2)} {user?.country_code === 'CH' ? 'CHF' : '€'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {report.exported && (
          <div className="p-4 bg-brand-50 border border-brand-200 rounded-lg text-sm text-brand-700">
            {t('sales.cannotModify')}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
