import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Users, ChevronUp, ChevronDown, MapPin, Phone, AlertCircle, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr, es, it } from 'date-fns/locale';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import { useAuth } from '../../contexts/AuthContext';
import { CustomersService } from '../../services/customers.service';
import type { CustomerWithStats, CountryCode } from '../../types';

const locales: Record<string, typeof fr> = { fr, es, it };
const COUNTRIES: CountryCode[] = ['FR', 'ES', 'IT', 'BE', 'CH'];

type SortField = 'name' | 'city' | 'type' | 'appointment_count' | 'last_appointment_date';
type SortDir = 'asc' | 'desc';

export function ClientsList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'prospect' | 'client'>('all');
  const [countryFilter, setCountryFilter] = useState<CountryCode | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const locale = locales[i18n.language] || fr;

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setError(null);
      const data = await CustomersService.getCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Error loading customers:', err);
      setError(t('clients.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-3.5 h-3.5 text-slate-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-brand-600" />
      : <ChevronDown className="w-3.5 h-3.5 text-brand-600" />;
  };

  const filtered = useMemo(() => {
    let result = customers;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q) ||
        (c.postal_code || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.erp_code || '').toLowerCase().includes(q)
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter(c => c.type === typeFilter);
    }

    if (countryFilter !== 'all') {
      result = result.filter(c => c.country_code === countryFilter);
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'city':
          cmp = (a.city || '').localeCompare(b.city || '');
          break;
        case 'type':
          cmp = (a.type || '').localeCompare(b.type || '');
          break;
        case 'appointment_count':
          cmp = a.appointment_count - b.appointment_count;
          break;
        case 'last_appointment_date':
          cmp = (a.last_appointment_date || '').localeCompare(b.last_appointment_date || '');
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [customers, searchQuery, typeFilter, countryFilter, sortField, sortDir]);

  if (loading) {
    return (
      <MainLayout>
        <Loading text={t('clients.loadingClients')} />
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
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-slate-900">{t('clients.title')}</h1>
          {isAdmin && (
            <Button onClick={() => navigate('/clients/new')} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {t('clients.addClient')}
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('clients.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          >
            <option value="all">{t('clients.allTypes')}</option>
            <option value="prospect">{t('clients.prospect')}</option>
            <option value="client">{t('clients.client')}</option>
          </select>
          {isAdmin && (
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value as typeof countryFilter)}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
            >
              <option value="all">{t('clients.allCountries')}</option>
              {COUNTRIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>

        <p className="text-sm text-slate-500">
          {filtered.length} {t('clients.title').toLowerCase()}
        </p>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="w-16 h-16" />}
            title={t('clients.noClients')}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Card padding={false}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80">
                        <th className="text-left px-4 py-3">
                          <button onClick={() => handleSort('name')} className="flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900">
                            {t('clients.name')} <SortIcon field="name" />
                          </button>
                        </th>
                        <th className="text-left px-4 py-3">
                          <button onClick={() => handleSort('city')} className="flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900">
                            {t('clients.city')} <SortIcon field="city" />
                          </button>
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">{t('clients.phone')}</th>
                        <th className="text-left px-4 py-3">
                          <button onClick={() => handleSort('type')} className="flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900">
                            {t('clients.type')} <SortIcon field="type" />
                          </button>
                        </th>
                        {isAdmin && (
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">{t('clients.country')}</th>
                        )}
                        <th className="text-center px-4 py-3">
                          <button onClick={() => handleSort('appointment_count')} className="flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 mx-auto">
                            {t('clients.appointmentCount')} <SortIcon field="appointment_count" />
                          </button>
                        </th>
                        <th className="text-left px-4 py-3">
                          <button onClick={() => handleSort('last_appointment_date')} className="flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900">
                            {t('clients.lastAppointment')} <SortIcon field="last_appointment_date" />
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map(customer => (
                        <tr
                          key={customer.id}
                          onClick={() => navigate(`/clients/${customer.id}`)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-slate-900">{customer.name}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {customer.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                {customer.city}{customer.postal_code ? ` (${customer.postal_code})` : ''}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {customer.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                {customer.phone}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {customer.type && (
                              <Badge variant={customer.type === 'client' ? 'success' : 'info'}>
                                {t(`clients.${customer.type}`)}
                              </Badge>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3">
                              <Badge>{customer.country_code}</Badge>
                            </td>
                          )}
                          <td className="px-4 py-3 text-center font-medium text-slate-700">
                            {customer.appointment_count}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {customer.last_appointment_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                {format(parseISO(customer.last_appointment_date), 'd MMM yyyy', { locale })}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            <div className="md:hidden space-y-3 pb-20">
              {filtered.map(customer => (
                <Card
                  key={customer.id}
                  padding={false}
                  className="rounded-xl hover:shadow-card-hover transition-shadow cursor-pointer"
                  onClick={() => navigate(`/clients/${customer.id}`)}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base font-semibold text-slate-900 flex-1">{customer.name}</h3>
                      <div className="flex items-center gap-1.5 ml-2">
                        {customer.type && (
                          <Badge variant={customer.type === 'client' ? 'success' : 'info'}>
                            {t(`clients.${customer.type}`)}
                          </Badge>
                        )}
                        {isAdmin && <Badge>{customer.country_code}</Badge>}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {customer.city && (
                        <div className="flex items-center text-sm text-slate-600">
                          <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                          {customer.city}{customer.postal_code ? ` (${customer.postal_code})` : ''}
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center text-sm text-slate-600">
                          <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                          {customer.phone}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-500">
                        {customer.appointment_count} {t('clients.appointmentCount').toLowerCase()}
                      </span>
                      {customer.last_appointment_date && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(parseISO(customer.last_appointment_date), 'd MMM yyyy', { locale })}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
