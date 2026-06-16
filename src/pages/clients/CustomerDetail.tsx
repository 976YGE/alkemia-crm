import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, MapPin, Phone, Mail, Calendar, Clock, User,
  Tag, AlertCircle, Building2, Hash
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr, es, it } from 'date-fns/locale';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { CustomersService } from '../../services/customers.service';
import type { Customer } from '../../types';

const locales: Record<string, typeof fr> = { fr, es, it };

interface AppointmentRow {
  id: string;
  appointment_date: string;
  appointment_time: string;
  appointment_end_time: string | null;
  appointment_type: string | null;
  store_name: string;
  status: string;
  user_code: { id: string; first_name: string; last_name: string; code: string } | null;
  sales_report: { id: string; status: string; total_amount: number; exported: boolean }[] | null;
}

export function CustomerDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const locale = locales[i18n.language] || fr;

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (customerId: string) => {
    try {
      setError(null);
      const [cust, appts] = await Promise.all([
        CustomersService.getCustomerById(customerId),
        CustomersService.getCustomerAppointments(customerId),
      ]);
      if (!cust) {
        setError('Client introuvable');
        return;
      }
      setCustomer(cust);
      setAppointments(appts);
    } catch (err) {
      console.error('Error loading customer:', err);
      setError(t('clients.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    if (time.length === 5 && time.includes(':')) return time;
    const [hours, minutes] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  };

  const getReportBadge = (row: AppointmentRow) => {
    const report = row.sales_report?.[0];
    if (!report) return <Badge variant="default">{t('clients.noReport')}</Badge>;
    if (report.exported) return <Badge variant="info">{t('clients.exported')}</Badge>;
    if (report.status === 'validated') return <Badge variant="success">{t('clients.validated')}</Badge>;
    return <Badge variant="warning">{t('clients.draft')}</Badge>;
  };

  const getTypeBadge = (type: string | null) => {
    if (!type) return null;
    const labels: Record<string, string> = {
      animation: t('clients.animation'),
      formation: t('clients.formation'),
      rdv_passage: t('clients.rdvPassage'),
    };
    const colors: Record<string, string> = {
      animation: 'bg-teal-100 text-teal-700',
      formation: 'bg-amber-100 text-amber-700',
      rdv_passage: 'bg-slate-100 text-slate-700',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[type] || 'bg-slate-100 text-slate-700'}`}>
        <Tag className="w-3 h-3" />
        {labels[type] || type}
      </span>
    );
  };

  if (loading) {
    return <MainLayout><Loading text={t('common.loading')} /></MainLayout>;
  }

  if (error || !customer) {
    return (
      <MainLayout>
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error || 'Client introuvable'}</span>
        </div>
      </MainLayout>
    );
  }

  const fullAddress = [customer.address, customer.postal_code, customer.city]
    .filter(Boolean).join(', ');

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/clients')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {customer.type && (
                <Badge variant={customer.type === 'client' ? 'success' : 'info'}>
                  {t(`clients.${customer.type}`)}
                </Badge>
              )}
              <Badge>{customer.country_code}</Badge>
              <Badge variant={customer.source === 'import' ? 'default' : 'warning'}>
                {customer.source === 'import' ? t('clients.imported') : t('clients.manual')}
              </Badge>
            </div>
          </div>
        </div>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('clients.information')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fullAddress && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">{t('clients.address')}</p>
                  <p className="text-sm text-slate-900">{fullAddress}</p>
                </div>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">{t('clients.phone')}</p>
                  <p className="text-sm text-slate-900">{customer.phone}</p>
                </div>
              </div>
            )}
            {customer.email && (
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">{t('clients.email')}</p>
                  <p className="text-sm text-slate-900">{customer.email}</p>
                </div>
              </div>
            )}
            {customer.erp_code && (
              <div className="flex items-start gap-3">
                <Hash className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">{t('clients.erpCode')}</p>
                  <p className="text-sm text-slate-900 font-mono">{customer.erp_code}</p>
                </div>
              </div>
            )}
            {customer.old_crm_code && (
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">{t('clients.crmCode')}</p>
                  <p className="text-sm text-slate-900 font-mono">{customer.old_crm_code}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500 mb-0.5">{t('clients.createdAt')}</p>
                <p className="text-sm text-slate-900">
                  {format(parseISO(customer.created_at), 'd MMMM yyyy', { locale })}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {t('clients.appointmentsHistory')}
            {appointments.length > 0 && (
              <span className="ml-2 text-sm font-normal text-slate-500">({appointments.length})</span>
            )}
          </h2>

          {appointments.length === 0 ? (
            <EmptyState
              icon={<Calendar className="w-12 h-12" />}
              title={t('clients.noAppointments')}
            />
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">{t('agenda.date')}</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">{t('agenda.time')}</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">{t('clients.animator')}</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">{t('clients.appointmentType')}</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">{t('clients.reportStatus')}</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-slate-600">{t('clients.revenue')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appointments.map(appt => {
                      const report = appt.sales_report?.[0];
                      return (
                        <tr
                          key={appt.id}
                          onClick={() => navigate(`/agenda/${appt.id}`)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 text-slate-900">
                            {format(parseISO(appt.appointment_date), 'd MMM yyyy', { locale })}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatTime(appt.appointment_time)}
                            {appt.appointment_end_time && ` - ${formatTime(appt.appointment_end_time)}`}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {appt.user_code && (
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                {appt.user_code.first_name} {appt.user_code.last_name}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">{getTypeBadge(appt.appointment_type)}</td>
                          <td className="px-4 py-3">{getReportBadge(appt)}</td>
                          <td className="px-4 py-3 text-right font-medium">
                            {report?.status === 'validated' && report.total_amount > 0 ? (
                              <span className="text-emerald-600">{report.total_amount.toFixed(2)} {customer.country_code === 'CH' ? 'CHF' : '€'}</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3">
                {appointments.map(appt => {
                  const report = appt.sales_report?.[0];
                  return (
                    <div
                      key={appt.id}
                      onClick={() => navigate(`/agenda/${appt.id}`)}
                      className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-900">
                          {format(parseISO(appt.appointment_date), 'd MMM yyyy', { locale })}
                        </span>
                        {getReportBadge(appt)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Clock className="w-3 h-3" />
                          {formatTime(appt.appointment_time)}
                          {appt.appointment_end_time && ` - ${formatTime(appt.appointment_end_time)}`}
                        </div>
                        {appt.user_code && (
                          <div className="flex items-center gap-1 text-xs text-slate-600">
                            <User className="w-3 h-3" />
                            {appt.user_code.first_name} {appt.user_code.last_name}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          {getTypeBadge(appt.appointment_type)}
                          {report?.status === 'validated' && report.total_amount > 0 && (
                            <span className="text-sm font-medium text-emerald-600">{report.total_amount.toFixed(2)} {customer.country_code === 'CH' ? 'CHF' : '€'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
