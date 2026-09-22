import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { AnimatorStats } from '../../services/stats.service';

interface AnimatorRankingProps {
  animators: AnimatorStats[];
}

type SortKey = 'name' | 'country' | 'animations' | 'totalRevenue' | 'avgRevenue' | 'noSaleCount';
type SortDir = 'asc' | 'desc';

const COUNTRY_FLAGS: Record<string, string> = {
  FR: '\uD83C\uDDEB\uD83C\uDDF7',
  BE: '\uD83C\uDDE7\uD83C\uDDEA',
  CH: '\uD83C\uDDE8\uD83C\uDDED',
  ES: '\uD83C\uDDEA\uD83C\uDDF8',
  IT: '\uD83C\uDDEE\uD83C\uDDF9',
};

function formatNum(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
}

export function AnimatorRanking({ animators }: AnimatorRankingProps) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<SortKey>('totalRevenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    const copy = [...animators];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
          break;
        case 'country':
          cmp = a.countryCode.localeCompare(b.countryCode);
          break;
        default:
          cmp = (a[sortKey] as number) - (b[sortKey] as number);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [animators, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'name' || key === 'country' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronDown className="w-3 h-3 text-slate-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-brand-600" />
      : <ChevronDown className="w-3.5 h-3.5 text-brand-600" />;
  };

  const columns: { key: SortKey; label: string; align: string }[] = [
    { key: 'name', label: t('stats.animatorName'), align: 'text-left' },
    { key: 'country', label: t('stats.country'), align: 'text-center' },
    { key: 'animations', label: t('stats.animationsCount'), align: 'text-right' },
    { key: 'totalRevenue', label: t('stats.ca'), align: 'text-right' },
    { key: 'avgRevenue', label: t('stats.avgCa'), align: 'text-right' },
    { key: 'noSaleCount', label: t('stats.noSales'), align: 'text-right' },
  ];

  return (
    <div className="overflow-x-auto -mx-4 md:-mx-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map(col => (
              <th
                key={col.key}
                className={`py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wider cursor-pointer select-none hover:text-slate-700 transition-colors ${col.align}`}
                onClick={() => toggleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  <SortIcon col={col.key} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((a, i) => (
            <tr
              key={a.userId}
              className="border-b border-slate-100 transition-colors hover:bg-slate-50"
            >
              <td className="py-2.5 px-4 font-medium text-slate-700">
                <span className="inline-flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                    {i + 1}
                  </span>
                  {a.lastName} {a.firstName}
                </span>
              </td>
              <td className="py-2.5 px-4 text-center">
                <span title={a.countryCode}>{COUNTRY_FLAGS[a.countryCode] || a.countryCode}</span>
              </td>
              <td className="py-2.5 px-4 text-right tabular-nums">{a.animations}</td>
              <td className="py-2.5 px-4 text-right tabular-nums font-medium">{formatNum(a.totalRevenue)} &euro;</td>
              <td className="py-2.5 px-4 text-right tabular-nums">{formatNum(a.avgRevenue)} &euro;</td>
              <td className="py-2.5 px-4 text-right tabular-nums">{a.noSaleCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
