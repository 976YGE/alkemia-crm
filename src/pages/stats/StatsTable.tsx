import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { YearStats } from '../../services/stats.service';

interface StatsTableProps {
  yearStats: YearStats;
  compareStats: YearStats | null;
  monthLabels: string[];
}

function formatNum(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
}

function CellVariation({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return <span className="text-emerald-600 text-[10px]">--</span>;

  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <Minus className="w-3 h-3 text-slate-400 inline" />;

  const isUp = pct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isUp ? '+' : ''}{pct}%
    </span>
  );
}

export function StatsTable({ yearStats, compareStats, monthLabels }: StatsTableProps) {
  const { t } = useTranslation();
  const hasCompare = !!compareStats;

  return (
    <div className="overflow-x-auto -mx-4 md:-mx-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider">{t('stats.month')}</th>
            <th className="text-right py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider">{t('stats.animationsCount')}</th>
            <th className="text-right py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider">{t('stats.ca')}</th>
            <th className="text-right py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider">{t('stats.avgCa')}</th>
            <th className="text-right py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider">{t('stats.noSales')}</th>
          </tr>
        </thead>
        <tbody>
          {yearStats.months.map((m, i) => {
            const cm = compareStats?.months[i];
            return (
              <tr
                key={m.month}
                className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${m.animations === 0 ? 'text-slate-400' : ''}`}
              >
                <td className="py-2.5 px-4 font-medium text-slate-700">{monthLabels[i]}</td>
                <td className="py-2.5 px-4 text-right tabular-nums">
                  {m.animations}
                  {hasCompare && cm && <div><CellVariation current={m.animations} previous={cm.animations} /></div>}
                </td>
                <td className="py-2.5 px-4 text-right tabular-nums">
                  {formatNum(m.totalRevenue)} &euro;
                  {hasCompare && cm && <div><CellVariation current={m.totalRevenue} previous={cm.totalRevenue} /></div>}
                </td>
                <td className="py-2.5 px-4 text-right tabular-nums">
                  {m.avgRevenue > 0 ? `${formatNum(m.avgRevenue)} \u20AC` : '--'}
                  {hasCompare && cm && <div><CellVariation current={m.avgRevenue} previous={cm.avgRevenue} /></div>}
                </td>
                <td className="py-2.5 px-4 text-right tabular-nums">
                  {m.noSaleCount}
                  {hasCompare && cm && <div><CellVariation current={m.noSaleCount} previous={cm.noSaleCount} /></div>}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-300 font-semibold bg-slate-50">
            <td className="py-3 px-4 text-slate-900">{t('stats.total')}</td>
            <td className="py-3 px-4 text-right tabular-nums text-slate-900">
              {yearStats.totalAnimations}
              {hasCompare && compareStats && <div><CellVariation current={yearStats.totalAnimations} previous={compareStats.totalAnimations} /></div>}
            </td>
            <td className="py-3 px-4 text-right tabular-nums text-slate-900">
              {formatNum(yearStats.totalRevenue)} &euro;
              {hasCompare && compareStats && <div><CellVariation current={yearStats.totalRevenue} previous={compareStats.totalRevenue} /></div>}
            </td>
            <td className="py-3 px-4 text-right tabular-nums text-slate-900">
              {formatNum(yearStats.avgRevenue)} &euro;
              {hasCompare && compareStats && <div><CellVariation current={yearStats.avgRevenue} previous={compareStats.avgRevenue} /></div>}
            </td>
            <td className="py-3 px-4 text-right tabular-nums text-slate-900">
              {yearStats.noSaleCount}
              {hasCompare && compareStats && <div><CellVariation current={yearStats.noSaleCount} previous={compareStats.noSaleCount} /></div>}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
