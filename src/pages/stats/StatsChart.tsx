import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import type { YearStats } from '../../services/stats.service';

interface StatsChartProps {
  yearStats: YearStats;
  compareStats: YearStats | null;
  monthLabels: string[];
  selectedYear: number;
  compareYear: number | null;
}

function formatEur(value: number): string {
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return `${value}`;
}

export function StatsChart({ yearStats, compareStats, monthLabels, selectedYear, compareYear }: StatsChartProps) {
  const chartData = useMemo(() => {
    return yearStats.months.map((m, i) => {
      const entry: Record<string, string | number> = {
        name: monthLabels[i],
        revenue: m.totalRevenue,
        animations: m.animations,
      };
      if (compareStats) {
        const cm = compareStats.months[i];
        entry.compareRevenue = cm.totalRevenue;
        entry.compareAnimations = cm.animations;
      }
      return entry;
    });
  }, [yearStats, compareStats, monthLabels]);

  return (
    <div className="w-full h-[350px] md:h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          <YAxis
            yAxisId="revenue"
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatEur}
            width={50}
          />
          <YAxis
            yAxisId="count"
            orientation="right"
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            width={30}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '13px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            formatter={(value: number, name: string) => {
              const isRevenue = name.toLowerCase().includes('ca') || name.toLowerCase().includes('revenue');
              return [isRevenue ? `${Number(value).toLocaleString('fr-FR')} \u20AC` : value, name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
          />

          {compareStats && (
            <Bar
              yAxisId="revenue"
              dataKey="compareRevenue"
              name={`CA ${compareYear}`}
              fill="#cbd5e1"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
          )}
          <Bar
            yAxisId="revenue"
            dataKey="revenue"
            name={`CA ${selectedYear}`}
            fill="#0d9488"
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="animations"
            name={`Anim. ${selectedYear}`}
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 3, fill: '#f59e0b' }}
            activeDot={{ r: 5 }}
          />
          {compareStats && (
            <Line
              yAxisId="count"
              type="monotone"
              dataKey="compareAnimations"
              name={`Anim. ${compareYear}`}
              stroke="#fbbf24"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: '#fbbf24' }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
