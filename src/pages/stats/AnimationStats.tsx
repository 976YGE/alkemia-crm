import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, TrendingUp, TrendingDown, Minus, Calendar, Target, ShoppingCart, XCircle } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { useAuth } from '../../contexts/AuthContext';
import { StatsService, type YearStats, type AnimatorStats } from '../../services/stats.service';
import { StatsChart } from './StatsChart';
import { StatsTable } from './StatsTable';
import { AnimatorRanking } from './AnimatorRanking';

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

function VariationBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return <span className="ml-2 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">Nouveau</span>;

  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="ml-2 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600"><Minus className="w-3 h-3" /> 0%</span>;

  const isUp = pct > 0;
  return (
    <span className={`ml-2 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isUp ? '+' : ''}{pct}%
    </span>
  );
}

export function AnimationStats() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'hr_manager';

  const availableYears = useMemo(() => StatsService.getAvailableYears(), []);
  const [selectedYear, setSelectedYear] = useState(availableYears[0]);
  const [compareYear, setCompareYear] = useState<number | null>(null);
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [animatorFilter, setAnimatorFilter] = useState<string>('');

  const [countries, setCountries] = useState<{ code: string; name: string }[]>([]);
  const [animatorOptions, setAnimatorOptions] = useState<{ userId: string; firstName: string; lastName: string }[]>([]);

  const [yearStats, setYearStats] = useState<YearStats | null>(null);
  const [compareStats, setCompareStats] = useState<YearStats | null>(null);
  const [animatorStats, setAnimatorStats] = useState<AnimatorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    StatsService.getCountries().then(setCountries).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    StatsService.getAnimatorOptions(countryFilter || undefined).then(setAnimatorOptions).catch(() => {});
  }, [isAdmin, countryFilter]);

  useEffect(() => {
    if (!countryFilter) return;
    setAnimatorFilter(prev => {
      const match = animatorOptions.find(a => a.userId === prev);
      return match ? prev : '';
    });
  }, [countryFilter, animatorOptions]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const params = {
          year: selectedYear,
          userId: isAdmin ? (animatorFilter || undefined) : user?.id,
          countryCode: isAdmin ? (countryFilter || undefined) : undefined,
        };

        const months = await StatsService.getMonthlyStats(params);
        if (cancelled) return;
        setYearStats(StatsService.buildYearStats(selectedYear, months));

        if (compareYear) {
          const cMonths = await StatsService.getMonthlyStats({ ...params, year: compareYear });
          if (cancelled) return;
          setCompareStats(StatsService.buildYearStats(compareYear, cMonths));
        } else {
          setCompareStats(null);
        }

        if (isAdmin && !animatorFilter) {
          const aStats = await StatsService.getAnimatorStats({
            year: selectedYear,
            countryCode: countryFilter || undefined,
          });
          if (cancelled) return;
          setAnimatorStats(aStats);
        } else {
          setAnimatorStats([]);
        }
      } catch {
        if (!cancelled) setError(t('common.error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [selectedYear, compareYear, countryFilter, animatorFilter, isAdmin, user?.id, t]);

  const monthLabels = MONTH_KEYS.map(k => t(`stats.months.${k}`));

  const kpiCards = yearStats ? [
    {
      label: t('stats.totalRevenue'),
      value: formatCurrency(yearStats.totalRevenue),
      compareValue: compareStats?.totalRevenue,
      currentValue: yearStats.totalRevenue,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-brand-600',
      bg: 'bg-brand-50',
    },
    {
      label: t('stats.totalAnimations'),
      value: yearStats.totalAnimations.toString(),
      compareValue: compareStats?.totalAnimations,
      currentValue: yearStats.totalAnimations,
      icon: <Calendar className="w-5 h-5" />,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
    },
    {
      label: t('stats.avgRevenue'),
      value: formatCurrency(yearStats.avgRevenue),
      compareValue: compareStats?.avgRevenue,
      currentValue: yearStats.avgRevenue,
      icon: <Target className="w-5 h-5" />,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: t('stats.lastQuarterAvg'),
      value: formatCurrency(yearStats.lastQuarterAvg),
      compareValue: compareStats?.lastQuarterAvg,
      currentValue: yearStats.lastQuarterAvg,
      icon: <ShoppingCart className="w-5 h-5" />,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: t('stats.noSaleRate'),
      value: `${yearStats.noSaleRate}%`,
      compareValue: compareStats?.noSaleRate,
      currentValue: yearStats.noSaleRate,
      icon: <XCircle className="w-5 h-5" />,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
      invertVariation: true,
    },
  ] : [];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in pb-20 md:pb-4">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-brand-50 rounded-xl">
              <BarChart3 className="w-6 h-6 text-brand-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{t('stats.title')}</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">{t('stats.subtitle')}</p>
        </div>

        {/* Filters */}
        <Card className="!p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[140px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('stats.year')}</label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              >
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className="min-w-[160px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('stats.compareWith')}</label>
              <select
                value={compareYear ?? ''}
                onChange={e => setCompareYear(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
              >
                <option value="">{t('stats.noComparison')}</option>
                {availableYears.filter(y => y !== selectedYear).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {isAdmin && (
              <>
                <div className="min-w-[160px]">
                  <label className="block text-xs font-medium text-slate-500 mb-1">{t('stats.country')}</label>
                  <select
                    value={countryFilter}
                    onChange={e => { setCountryFilter(e.target.value); setAnimatorFilter(''); }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  >
                    <option value="">{t('stats.allCountries')}</option>
                    {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>

                <div className="min-w-[200px]">
                  <label className="block text-xs font-medium text-slate-500 mb-1">{t('stats.animator')}</label>
                  <select
                    value={animatorFilter}
                    onChange={e => setAnimatorFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  >
                    <option value="">{t('stats.allAnimators')}</option>
                    {animatorOptions.map(a => (
                      <option key={a.userId} value={a.userId}>{a.lastName} {a.firstName}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </Card>

        {loading ? (
          <Loading />
        ) : error ? (
          <Card className="text-center py-12">
            <p className="text-red-500">{error}</p>
          </Card>
        ) : yearStats ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {kpiCards.map(card => (
                <Card key={card.label} className="!p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg ${card.bg}`}>
                      <span className={card.color}>{card.icon}</span>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-slate-500 mb-1">{card.label}</p>
                  <div className="flex items-baseline flex-wrap">
                    <span className="text-xl font-bold text-slate-900">{card.value}</span>
                    {compareStats && card.compareValue !== undefined && (
                      <VariationBadge
                        current={card.invertVariation ? -(card.currentValue) : card.currentValue}
                        previous={card.invertVariation ? -(card.compareValue) : card.compareValue}
                      />
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Chart */}
            <Card padding={false} className="!p-4 md:!p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4">{t('stats.monthlyRevenue')}</h2>
              <StatsChart
                yearStats={yearStats}
                compareStats={compareStats}
                monthLabels={monthLabels}
                selectedYear={selectedYear}
                compareYear={compareYear}
              />
            </Card>

            {/* Monthly Table */}
            <Card padding={false} className="!p-4 md:!p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4">{t('stats.monthlyDetail')}</h2>
              <StatsTable
                yearStats={yearStats}
                compareStats={compareStats}
                monthLabels={monthLabels}
              />
            </Card>

            {/* Animator Ranking */}
            {isAdmin && !animatorFilter && animatorStats.length > 0 && (
              <Card padding={false} className="!p-4 md:!p-6">
                <h2 className="text-base font-semibold text-slate-900 mb-4">{t('stats.animatorRanking')}</h2>
                <AnimatorRanking animators={animatorStats} />
              </Card>
            )}
          </>
        ) : null}
      </div>
    </MainLayout>
  );
}
