import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, MapPin, AlertCircle, FileText, ChevronRight, Users, User, Tag, Filter, X, EyeOff, Eye } from 'lucide-react';
import { format, parseISO, startOfWeek, addDays, isSameDay } from 'date-fns';
import { fr, es, it } from 'date-fns/locale';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import { useAuth } from '../../contexts/AuthContext';
import { AppointmentsService } from '../../services/appointments.service';
import { DateNavigator } from '../../components/agenda/DateNavigator';
import type { AppointmentWithReport, CountryCode } from '../../types';

const COUNTRIES: CountryCode[] = ['FR', 'ES', 'IT', 'BE', 'CH'];

const COUNTRY_FLAGS: Record<CountryCode, string> = {
  FR: '\u{1F1EB}\u{1F1F7}',
  ES: '\u{1F1EA}\u{1F1F8}',
  IT: '\u{1F1EE}\u{1F1F9}',
  BE: '\u{1F1E7}\u{1F1EA}',
  CH: '\u{1F1E8}\u{1F1ED}',
};

const locales = { fr, es, it };

export function AgendaList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [appointments, setAppointments] = useState<AppointmentWithReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [animatorFilter, setAnimatorFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<CountryCode | 'all'>('all');

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'hr_manager';

  const today = useMemo(() => new Date(), []);

  const [weekStart, setWeekStart] = useState<Date>(() => {
    const weekParam = searchParams.get('week');
    if (weekParam) {
      const parsed = parseISO(weekParam);
      if (!isNaN(parsed.getTime())) return startOfWeek(parsed, { weekStartsOn: 1 });
    }
    return startOfWeek(today, { weekStartsOn: 1 });
  });

  const [selectedDay, setSelectedDay] = useState<Date | null>(() => {
    const dayParam = searchParams.get('day');
    if (dayParam) {
      const parsed = parseISO(dayParam);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return today;
  });

  const updateSearchParams = useCallback((week: Date, day: Date | null) => {
    const params = new URLSearchParams(searchParams);
    params.set('week', format(week, 'yyyy-MM-dd'));
    if (day) {
      params.set('day', format(day, 'yyyy-MM-dd'));
    } else {
      params.delete('day');
    }
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleWeekChange = useCallback((newWeek: Date) => {
    setWeekStart(newWeek);
    setSelectedDay(null);
    updateSearchParams(newWeek, null);
  }, [updateSearchParams]);

  const handleDaySelect = useCallback((day: Date | null) => {
    setSelectedDay(day);
    updateSearchParams(weekStart, day);
  }, [weekStart, updateSearchParams]);

  useEffect(() => {
    loadAppointments();
  }, [user]);

  const loadAppointments = async () => {
    if (!user) return;

    try {
      setError(null);
      const data = isAdmin
        ? await AppointmentsService.getAllAppointments()
        : await AppointmentsService.getUserAppointments(user.user_code_id);
      setAppointments(data);
    } catch (err: unknown) {
      console.error('Error loading appointments:', err);
      const msg = err instanceof Error
        ? err.message
        : (typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : JSON.stringify(err));
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isUnknownAppointment = (apt: AppointmentWithReport) =>
    apt.store_name?.toUpperCase() === 'INCONNUE';

  const needsReport = (apt: AppointmentWithReport) =>
    !isUnknownAppointment(apt) && (apt.can_report || apt.sales_report?.status === 'draft');

  const matchAdminFilters = (apt: AppointmentWithReport) => {
    if (!isAdmin) return true;
    if (animatorFilter !== 'all' && apt.user_code?.id !== animatorFilter) return false;
    if (customerFilter !== 'all' && apt.customer?.id !== customerFilter) return false;
    if (countryFilter !== 'all' && apt.country_code !== countryFilter) return false;
    return true;
  };

  const adminFiltered = appointments.filter(matchAdminFilters);

  const visibleAppointments = adminFiltered.filter(apt => {
    if (!showCancelled && (apt as any).status === 'cancelled') return false;
    return true;
  });

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const dateFiltered = useMemo(() => {
    if (selectedDay) {
      return visibleAppointments.filter(apt => {
        const aptDate = parseISO(apt.appointment_date);
        return isSameDay(aptDate, selectedDay);
      });
    }
    return visibleAppointments.filter(apt => {
      const aptDate = parseISO(apt.appointment_date);
      return aptDate >= weekStart && aptDate <= weekEnd;
    });
  }, [visibleAppointments, selectedDay, weekStart, weekEnd]);

  const appointmentCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const apt of visibleAppointments) {
      const dateKey = apt.appointment_date;
      map.set(dateKey, (map.get(dateKey) || 0) + 1);
    }
    return map;
  }, [visibleAppointments]);

  const pendingReportDates = useMemo(() => {
    const set = new Set<string>();
    for (const apt of visibleAppointments) {
      if (needsReport(apt)) {
        set.add(apt.appointment_date);
      }
    }
    return set;
  }, [visibleAppointments]);

  const pendingReportAppointments = useMemo(() => {
    return visibleAppointments
      .filter(needsReport)
      .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));
  }, [visibleAppointments]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, AppointmentWithReport[]>();
    for (const apt of dateFiltered) {
      const key = apt.appointment_date;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(apt);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [dateFiltered]);

  const cancelledCount = adminFiltered.filter(a => (a as any).status === 'cancelled').length;

  const animatorOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const apt of appointments) {
      if (countryFilter !== 'all' && apt.country_code !== countryFilter) continue;
      if (apt.user_code?.id && !map.has(apt.user_code.id)) {
        const { id, first_name, last_name, code } = apt.user_code;
        map.set(id, { id, label: `${first_name} ${last_name} (${code})` });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [appointments, countryFilter]);

  const customerOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const apt of appointments) {
      if (countryFilter !== 'all' && apt.country_code !== countryFilter) continue;
      if (apt.customer?.id && !map.has(apt.customer.id)) {
        map.set(apt.customer.id, { id: apt.customer.id, label: apt.customer.name });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [appointments, countryFilter]);

  const countryOptions = useMemo(() => {
    const set = new Set<CountryCode>();
    for (const apt of appointments) {
      if (apt.country_code) set.add(apt.country_code);
    }
    return COUNTRIES.filter(c => set.has(c));
  }, [appointments]);

  useEffect(() => {
    if (animatorFilter !== 'all' && !animatorOptions.some(o => o.id === animatorFilter)) {
      setAnimatorFilter('all');
    }
    if (customerFilter !== 'all' && !customerOptions.some(o => o.id === customerFilter)) {
      setCustomerFilter('all');
    }
  }, [animatorOptions, customerOptions, animatorFilter, customerFilter]);

  const hasActiveAdminFilter = animatorFilter !== 'all' || customerFilter !== 'all' || countryFilter !== 'all';

  const resetAdminFilters = () => {
    setAnimatorFilter('all');
    setCustomerFilter('all');
    setCountryFilter('all');
  };

  const handlePendingBannerClick = () => {
    if (pendingReportAppointments.length === 0) return;
    const firstPending = pendingReportAppointments[0];
    const targetDate = parseISO(firstPending.appointment_date);
    const targetWeek = startOfWeek(targetDate, { weekStartsOn: 1 });
    setWeekStart(targetWeek);
    setSelectedDay(targetDate);
    updateSearchParams(targetWeek, targetDate);
  };

  const getStatusBadge = (appointment: AppointmentWithReport) => {
    if ((appointment as any).status === 'cancelled') {
      return <Badge variant="default">Annul\u00E9</Badge>;
    }
    if (!appointment.is_past) {
      return <Badge variant="info">{t('agenda.scheduled')}</Badge>;
    }
    if (appointment.sales_report) {
      if (appointment.sales_report.status === 'draft') {
        return <Badge variant="warning">{t('agenda.hasDraftReport')}</Badge>;
      }
      return <Badge variant="success">{t('agenda.hasValidatedReport')}</Badge>;
    }
    if (appointment.report_not_required || appointment.appointment_type === 'formation') {
      return <Badge variant="default">Compte rendu non requis</Badge>;
    }
    return <Badge variant="warning">{t('agenda.needsReport')}</Badge>;
  };

  const locale = locales[i18n.language as keyof typeof locales] || fr;

  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    if (time.length === 5 && time.includes(':')) return time;
    const [hours, minutes] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  };

  const getMapUrl = (address: string, city: string) => {
    const fullAddress = `${address}, ${city}`.trim();
    const encodedAddress = encodeURIComponent(fullAddress);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      return `https://maps.google.com/?q=${encodedAddress}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  };

  if (loading) {
    return (
      <MainLayout>
        <Loading text={t('common.loading')} />
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{t('agenda.title')}</h1>
              {isAdmin && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700">
                  <Users className="w-3.5 h-3.5" />
                  Tous les utilisateurs
                </span>
              )}
            </div>
          </div>
          {cancelledCount > 0 && (
            <button
              onClick={() => setShowCancelled(!showCancelled)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors inline-flex items-center gap-1.5 ${
                showCancelled
                  ? 'bg-slate-200 text-slate-700'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {showCancelled ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showCancelled ? 'Masquer annul\u00E9s' : `Annul\u00E9s (${cancelledCount})`}
            </button>
          )}
        </div>

        {pendingReportAppointments.length > 0 && (
          <button
            onClick={handlePendingBannerClick}
            className="w-full flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors text-left group"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 group-hover:bg-amber-200 transition-colors">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-amber-800">
                {pendingReportAppointments.length} {pendingReportAppointments.length > 1 ? 'comptes rendus' : 'compte rendu'} {t('agenda.toFill').toLowerCase()}
              </span>
              <p className="text-xs text-amber-600 mt-0.5 truncate">
                {t('agenda.viewDetails')}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-400 group-hover:text-amber-600 transition-colors flex-shrink-0" />
          </button>
        )}

        {isAdmin && (
          <Card padding={false} className="rounded-xl">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Filter className="w-4 h-4" />
                  Filtre
                </div>
                {hasActiveAdminFilter && (
                  <button
                    onClick={resetAdminFilters}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    R\u00E9initialiser
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Pays</label>
                  <select
                    value={countryFilter}
                    onChange={e => setCountryFilter(e.target.value as CountryCode | 'all')}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="all">Tous les pays</option>
                    {countryOptions.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Animateur</label>
                  <select
                    value={animatorFilter}
                    onChange={e => setAnimatorFilter(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="all">Tous les animateurs</option>
                    {animatorOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Client</label>
                  <select
                    value={customerFilter}
                    onChange={e => setCustomerFilter(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="all">Tous les clients</option>
                    {customerOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </Card>
        )}

        <DateNavigator
          weekStart={weekStart}
          selectedDay={selectedDay}
          appointmentCountByDate={appointmentCountByDate}
          pendingReportDates={pendingReportDates}
          onWeekChange={handleWeekChange}
          onDaySelect={handleDaySelect}
          locale={i18n.language}
          todayLabel={t('agenda.today')}
        />

        {dateFiltered.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-16 h-16" />}
            title={selectedDay ? t('agenda.noAppointmentsDay') : t('agenda.noAppointments')}
          />
        ) : (
          <div className="space-y-6 pb-20 md:pb-4">
            {groupedByDate.map(([dateKey, dayAppointments]) => (
              <div key={dateKey}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-6 rounded-full bg-brand-500" />
                  <h2 className="text-sm font-semibold text-slate-700 capitalize">
                    {capitalizeFirstLetter(format(parseISO(dateKey), 'EEEE d MMMM', { locale }))}
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">
                    {dayAppointments.length} rdv
                  </span>
                </div>
                <div className="space-y-3">
                  {dayAppointments.map((appointment) => {
                    const isCancelled = (appointment as any).status === 'cancelled';
                    const hasPendingReport = needsReport(appointment);
                    return (
                      <Card
                        key={appointment.id}
                        padding={false}
                        className={`rounded-xl transition-shadow cursor-pointer overflow-hidden ${
                          isCancelled
                            ? 'opacity-50 border-dashed border-slate-300'
                            : hasPendingReport
                            ? 'border-l-4 border-l-amber-400 hover:shadow-card-hover'
                            : 'hover:shadow-card-hover'
                        }`}
                        onClick={() => navigate(`/agenda/${appointment.id}`)}
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className={`text-lg font-semibold mb-1 ${isCancelled ? 'text-slate-500 line-through decoration-slate-400' : 'text-slate-900'}`}>
                                {isUnknownAppointment(appointment) ? 'Non Anim\u00E9' : appointment.store_name}
                              </h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                {!isUnknownAppointment(appointment) && getStatusBadge(appointment)}
                                {appointment.appointment_type && (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                    appointment.appointment_type === 'animation'
                                      ? 'bg-teal-100 text-teal-700'
                                      : appointment.appointment_type === 'formation'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    <Tag className="w-3 h-3" />
                                    {appointment.appointment_type === 'animation' ? 'Animation'
                                      : appointment.appointment_type === 'formation' ? 'Formation'
                                      : 'RDV de passage'}
                                  </span>
                                )}
                                {isAdmin && appointment.user_code && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                    <User className="w-3 h-3" />
                                    {appointment.user_code.first_name} {appointment.user_code.last_name}
                                  </span>
                                )}
                                {isAdmin && appointment.country_code && COUNTRY_FLAGS[appointment.country_code] && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                    <span className="text-sm leading-none">{COUNTRY_FLAGS[appointment.country_code]}</span>
                                    {appointment.country_code}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 ml-2" />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center text-sm text-slate-600">
                              <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                              <span>
                                {formatTime(appointment.appointment_time)}
                                {appointment.appointment_end_time && ` - ${formatTime(appointment.appointment_end_time)}`}
                              </span>
                            </div>

                            {(appointment.store_city || appointment.store_address) && (
                              <div className="flex items-start text-sm text-slate-600">
                                <MapPin className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                                <a
                                  href={getMapUrl(appointment.store_address || '', appointment.store_city || '')}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-brand-600 hover:text-brand-700 underline"
                                >
                                  {appointment.store_address && `${appointment.store_address}, `}
                                  {appointment.store_city}
                                </a>
                              </div>
                            )}

                            {appointment.sales_report?.status === 'validated' && appointment.sales_report.total_amount && (
                              <div className="mt-3 pt-3 border-t border-green-100">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-slate-600">{t('sales.totalAmount')}</span>
                                  <span className="text-lg font-bold text-green-600">
                                    {appointment.sales_report.total_amount.toFixed(2)} {appointment.country_code === 'CH' ? 'CHF' : '\u20AC'}
                                  </span>
                                </div>
                              </div>
                            )}

                            {!isCancelled && !isUnknownAppointment(appointment) && appointment.can_report && (
                              <div className="flex items-center text-sm text-orange-600 font-medium mt-3 pt-3 border-t border-orange-100">
                                <FileText className="w-4 h-4 mr-2" />
                                {t('agenda.createReport')}
                              </div>
                            )}

                            {!isCancelled && !isUnknownAppointment(appointment) && appointment.sales_report?.status === 'draft' && (
                              <div className="flex items-center text-sm text-brand-600 font-medium mt-3 pt-3 border-t border-brand-100">
                                <FileText className="w-4 h-4 mr-2" />
                                {t('agenda.editReport')}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
