import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { fr, es, it, de } from 'date-fns/locale';

const locales: Record<string, Locale> = { fr, es, it, de };

interface MiniCalendarProps {
  currentMonth: Date;
  selectedDate: Date | null;
  appointmentDates: Set<string>;
  onSelectDate: (date: Date) => void;
  onChangeMonth: (date: Date) => void;
  locale: string;
}

export function MiniCalendar({
  currentMonth,
  selectedDate,
  appointmentDates,
  onSelectDate,
  onChangeMonth,
  locale,
}: MiniCalendarProps) {
  const dateLocale = locales[locale] || fr;

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const weekDayHeaders = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      return format(day, 'EEEEE', { locale: dateLocale });
    });
  }, [dateLocale]);

  return (
    <div className="w-72 bg-white rounded-xl shadow-float border border-slate-200 p-4 animate-scale-in">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => onChangeMonth(subMonths(currentMonth, 1))}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>
        <span className="text-sm font-semibold text-slate-800 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
        </span>
        <button
          onClick={() => onChangeMonth(addMonths(currentMonth, 1))}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {weekDayHeaders.map((header, i) => (
          <div
            key={i}
            className="text-center text-xs font-medium text-slate-400 py-1"
          >
            {header}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const inMonth = isSameMonth(day, currentMonth);
          const selected = selectedDate && isSameDay(day, selectedDate);
          const today = isToday(day);
          const hasAppointments = appointmentDates.has(format(day, 'yyyy-MM-dd'));

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={`
                relative w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-all
                ${!inMonth ? 'text-slate-300' : 'text-slate-700'}
                ${selected ? 'bg-brand-600 text-white font-semibold shadow-sm' : ''}
                ${!selected && today ? 'ring-2 ring-brand-400 font-semibold' : ''}
                ${!selected && inMonth ? 'hover:bg-slate-100' : ''}
                ${!selected && !inMonth ? 'hover:bg-slate-50' : ''}
              `}
            >
              {format(day, 'd')}
              {hasAppointments && !selected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-500" />
              )}
              {hasAppointments && selected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/80" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
