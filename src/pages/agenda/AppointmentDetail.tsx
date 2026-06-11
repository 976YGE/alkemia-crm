import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, MapPin, ArrowLeft, FileText, CreditCard as Edit, Hash, Phone, User, ExternalLink, Tag } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr, es, it } from 'date-fns/locale';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { AppointmentsService } from '../../services/appointments.service';
import { SalesService } from '../../services/sales.service';
import { useAuth } from '../../contexts/AuthContext';
import type { AppointmentWithReport } from '../../types';

const locales = { fr, es, it };

export function AppointmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const [appointment, setAppointment] = useState<AppointmentWithReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [proofFileUrl, setProofFileUrl] = useState<string | null>(null);

  useEffect(() => {
    loadAppointment();
  }, [id]);

  const loadAppointment = async () => {
    if (!id) return;
    try {
      const data = await AppointmentsService.getAppointmentById(id);
      setAppointment(data);

      if (data?.sales_report?.proof_file_path) {
        try {
          const url = await SalesService.getProofFileUrl(data.sales_report.proof_file_path);
          setProofFileUrl(url);
        } catch (error) {
          console.error('Error loading proof file:', error);
        }
      }
    } catch (error) {
      console.error('Error loading appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const locale = locales[i18n.language as keyof typeof locales] || fr;

  const capitalizeFirstLetter = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  const formatTime = (time: string) => {
    if (!time) return '';
    if (time.length === 5 && time.includes(':')) return time;
    const [hours, minutes] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  };

  const getMapUrl = (address: string, postalCode: string, city: string) => {
    const fullAddress = `${address}, ${postalCode} ${city}`.trim();
    const encodedAddress = encodeURIComponent(fullAddress);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) return `https://maps.google.com/?q=${encodedAddress}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  };

  const currency = user?.country_code === 'CH' ? 'CHF' : '€';

  if (loading) {
    return (
      <MainLayout>
        <Loading text={t('common.loading')} />
      </MainLayout>
    );
  }

  if (!appointment) {
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

  const getStatusBadge = () => {
    if (!appointment.is_past) return <Badge variant="info">{t('agenda.scheduled')}</Badge>;
    if (appointment.sales_report) {
      if (appointment.sales_report.status === 'draft') return <Badge variant="warning">{t('agenda.hasDraftReport')}</Badge>;
      return <Badge variant="success">{t('agenda.hasValidatedReport')}</Badge>;
    }
    if (appointment.report_not_required || appointment.appointment_type === 'formation') {
      return <Badge variant="default">Compte rendu non requis</Badge>;
    }
    return <Badge variant="warning">{t('agenda.needsReport')}</Badge>;
  };

  const isUnknownAppointment = appointment.store_name?.toUpperCase() === 'INCONNUE';
  const report = appointment.sales_report;
  const calculatedTotal = report?.lines?.reduce((sum, line) => sum + line.line_amount, 0) || 0;
  const totalQuantity = report?.lines?.reduce((sum, line) => sum + line.quantity, 0) || 0;

  const categorizedLines = report?.lines?.reduce((acc, line) => {
    if (!line.product?.category) return acc;
    const categoryName = line.product.category.name;
    if (!acc[categoryName]) {
      acc[categoryName] = { category: line.product.category, lines: [] };
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
              <h1 className="text-2xl font-bold text-slate-900">{t('agenda.viewDetails')}</h1>
              <p className="text-sm text-slate-600 mt-1">
                {appointment.store_name} -{' '}
                {capitalizeFirstLetter(format(parseISO(appointment.appointment_date), 'd MMMM yyyy', { locale }))}
              </p>
            </div>
          </div>
          <div>{getStatusBadge()}</div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isUnknownAppointment ? 'Non Animé' : appointment.store_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center text-slate-700">
              <Calendar className="w-5 h-5 mr-3 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">{t('agenda.date')}</p>
                <p className="font-medium">
                  {capitalizeFirstLetter(format(parseISO(appointment.appointment_date), 'EEEE d MMMM yyyy', { locale }))}
                </p>
              </div>
            </div>

            <div className="flex items-center text-slate-700">
              <Clock className="w-5 h-5 mr-3 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">{t('agenda.time')}</p>
                <p className="font-medium">
                  {formatTime(appointment.appointment_time)}
                  {appointment.appointment_end_time && ` - ${formatTime(appointment.appointment_end_time)}`}
                </p>
              </div>
            </div>

            {appointment.appointment_type && (
              <div className="flex items-center text-slate-700">
                <Tag className="w-5 h-5 mr-3 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Type</p>
                  <p className="font-medium">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                      appointment.appointment_type === 'animation'
                        ? 'bg-teal-100 text-teal-700'
                        : appointment.appointment_type === 'formation'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {appointment.appointment_type === 'animation' ? 'Animation'
                        : appointment.appointment_type === 'formation' ? 'Formation'
                        : 'RDV de passage'}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {(appointment.store_address || appointment.store_city) && (
              <div className="flex items-start text-slate-700">
                <MapPin className="w-5 h-5 mr-3 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">{t('agenda.address')}</p>
                  <a
                    href={getMapUrl(
                      appointment.store_address || '',
                      appointment.store_postal_code || '',
                      appointment.store_city || ''
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand-600 hover:text-brand-800 underline block"
                  >
                    {appointment.store_address && <span>{appointment.store_address}<br /></span>}
                    {appointment.store_postal_code} {appointment.store_city}
                  </a>
                </div>
              </div>
            )}

            {appointment.user_code && (
              <div className="flex items-center text-slate-700">
                <User className="w-5 h-5 mr-3 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-500">Animateur</p>
                  <p className="font-medium">
                    {appointment.user_code.first_name} {appointment.user_code.last_name}
                    <span className="ml-2 text-sm text-slate-500 font-mono">({appointment.user_code.code})</span>
                  </p>
                </div>
              </div>
            )}

            {(appointment.old_crm_code || appointment.erp_code || appointment.phone) && (
              <div className="pt-4 border-t border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {appointment.old_crm_code && (
                    <div className="flex items-start space-x-3 p-3 bg-brand-50 rounded-lg border border-brand-200">
                      <Hash className="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-brand-700 uppercase tracking-wide mb-1">Code CRM</p>
                        <p className="text-lg font-bold text-brand-900 break-all">{appointment.old_crm_code}</p>
                      </div>
                    </div>
                  )}
                  {appointment.erp_code && (
                    <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <Hash className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">Code ERP</p>
                        <p className="text-lg font-bold text-green-900 break-all">{appointment.erp_code}</p>
                      </div>
                    </div>
                  )}
                  {appointment.phone && (
                    <div className="flex items-start space-x-3 p-3 bg-sky-50 rounded-lg border border-sky-200">
                      <Phone className="w-5 h-5 text-sky-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-sky-700 uppercase tracking-wide mb-1">Téléphone</p>
                        <a
                          href={`tel:${appointment.phone}`}
                          className="text-lg font-bold text-sky-900 hover:text-sky-700 underline break-all"
                        >
                          {appointment.phone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {appointment.notes && (() => {
              try {
                const parsed = JSON.parse(appointment.notes);
                if (parsed && typeof parsed === 'object' && ('old_crm_code' in parsed || 'erp_code' in parsed || 'phone' in parsed)) {
                  return null;
                }
              } catch {}
              return (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">{appointment.notes}</p>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {!isUnknownAppointment && appointment.can_report && (
          <Button
            fullWidth
            onClick={() => navigate(`/sales/create/${appointment.id}`)}
            className="flex items-center justify-center"
          >
            <FileText className="w-5 h-5 mr-2" />
            {t('agenda.createReport')}
          </Button>
        )}

        {!isUnknownAppointment && report && report.status === 'draft' && (
          <Button
            fullWidth
            onClick={() => navigate(`/sales/edit/${appointment.id}`)}
            className="flex items-center justify-center"
          >
            <Edit className="w-5 h-5 mr-2" />
            {t('agenda.editReport')}
          </Button>
        )}

        {report && report.status !== 'draft' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{t('sales.totalAmount')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">CA Global</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {report.total_amount.toFixed(2)} {currency}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">{totalQuantity} article{totalQuantity > 1 ? 's' : ''}</p>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm text-slate-600 mb-1">CA Calculé</p>
                    <p className="text-3xl font-bold text-brand-600">
                      {calculatedTotal.toFixed(2)} {currency}
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

            {Object.keys(categorizedLines).length > 0 && (
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
                        {lines.map((line: any) => (
                          <div key={line.id} className="px-4 py-3 flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 break-words leading-snug">{line.product.name}</p>
                              <div className="mt-1 space-y-0.5">
                                <p className="text-sm text-slate-600">
                                  {line.unit_price.toFixed(2)} {currency} × {line.quantity}
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
                              {line.line_amount.toFixed(2)} {currency}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {report.exported && (
              <div className="p-4 bg-brand-50 border border-brand-200 rounded-lg text-sm text-brand-700">
                {t('sales.cannotModify')}
              </div>
            )}

            <Button
              fullWidth
              variant="secondary"
              onClick={() => navigate(`/sales/${report.id}`)}
              className="flex items-center justify-center"
            >
              <FileText className="w-5 h-5 mr-2" />
              {t('agenda.viewReport')}
            </Button>
          </>
        )}
      </div>
    </MainLayout>
  );
}
