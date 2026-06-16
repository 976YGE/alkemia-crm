import { useEffect, useRef, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import {
  startOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  format,
  isSameDay,
  isToday,
  isSameWeek,
} from 'date-fns';
import { fr, es, it, de } from 'date-fns/locale';
import { MiniCalendar } from './MiniCalendar';

const locales: Record<string, Locale> = { fr, es, it, de };

interface DateNavigatorProps {
  weekStart: Date;
  selectedDay: Date | null;
  appointmentCountByDate: Map<string, number>;
  pendingReportDates?: Set<string>;
  onWeekChange: (weekStart: Date) => void;
  onDaySelect: (day: Date | null) => void;
  locale: string;
  todayLabel: string;
}

export function DateNavigator({
  weekStart,
  selectedDay,
  appointmentCountByDate,
  pendingReportDates,
  onWeekChange,
  onDaySelect,
  locale,
  todayLabel,
}: DateNavigatorProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(weekStart);
  const calendarRef = useRef<HTMLDivElement>(null);
  const dateLocale = locales[locale] || fr;

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const isCurrentWeek = isSameWeek(weekStart, new Date(), { weekStartsOn: 1 });

  const appointmentDatesSet = useMemo(() => {
    return new Set(appointmentCountByDate.keys());
  }, [appointmentCountByDate]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    }
    if (calendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [calendarOpen]);

  const handlePrevWeek = () => onWeekChange(subWeeks(weekStart, 1));
  const handleNextWeek = () => onWeekChange(addWeeks(weekStart, 1));

  const handleToday = () => {
    const today = new Date();
    const mondayOfToday = startOfWeek(today, { weekStartsOn: 1 });
    onWeekChange(mondayOfToday);
    onDaySelect(today);
  };

  const handleDayClick = (day: Date) => {
    if (selectedDay && isSameDay(day, selectedDay)) {
      onDaySelect(null);
    } else {
      onDaySelect(day);
    }
  };

  const handleCalendarSelect = (date: Date) => {
    const monday = startOfWeek(date, { weekStartsOn: 1 });
    onWeekChange(monday);
    onDaySelect(date);
    setCalendarOpen(false);
  };

  const weekRangeLabel = useMemo(() => {
    const end = addDays(weekStart, 6);
    const startStr = format(weekStart, 'd MMM', { locale: dateLocale });
    const endStr = format(end, 'd MMM yyyy', { locale: dateLocale });
    return `${startStr} - ${endStr}`;
  }, [weekStart, dateLocale]);

  return (
    <div className="bg-white rounded-xl shadow-card border border-slate-200/60 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-sm font-medium text-slate-700 min-w-[140px] text-center capitalize">
            {weekRangeLabel}
          </span>
          <button
            onClick={handleNextWeek}
            className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!isCurrentWeek && (
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
            >
              {todayLabel}
            </button>
          )}
          <div className="relative" ref={calendarRef}>
            <button
              onClick={() => {
                setCalendarMonth(selectedDay || weekStart);
                setCalendarOpen(!calendarOpen);
              }}
              className={`p-2 rounded-lg transition-colors ${
                calendarOpen
                  ? 'bg-brand-100 text-brand-700'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
              aria-label="Open calendar"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            {calendarOpen && (
              <div className="absolute right-0 top-full mt-2 z-50">
                <MiniCalendar
                  currentMonth={calendarMonth}
                  selectedDate={selectedDay}
                  appointmentDates={appointmentDatesSet}
                  onSelectDate={handleCalendarSelect}
                  onChangeMonth={setCalendarMonth}
                  locale={locale}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {weekDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const count = appointmentCountByDate.get(dateKey) || 0;
          const hasPending = pendingReportDates?.has(dateKey) || false;
          const selected = selectedDay && isSameDay(day, selectedDay);
          const today = isToday(day);
          const dayAbbr = format(day, 'EEE', { locale: dateLocale });
          const dayNum = format(day, 'd');

          return (
            <button
              key={dateKey}
              onClick={() => handleDayClick(day)}
              className={`
                relative flex flex-col items-center py-2 px-1 rounded-xl transition-all duration-200
                ${selected
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-200'
                  : today
                    ? 'bg-brand-50 ring-2 ring-brand-300'
                    : 'hover:bg-slate-50'
                }
              `}
            >
              <span className={`text-xs font-medium capitalize ${
                selected ? 'text-brand-100' : 'text-slate-500'
              }`}>
                {dayAbbr}
              </span>
              <span className={`text-lg font-semibold mt-0.5 ${
                selected ? 'text-white' : today ? 'text-brand-700' : 'text-slate-800'
              }`}>
                {dayNum}
              </span>
              {count > 0 && (
                <div className="mt-1 flex items-center gap-1">
                  <span className={`
                    min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold
                    ${selected
                      ? 'bg-white/20 text-white'
                      : 'bg-brand-100 text-brand-700'
                    }
                  `}>
                    {count}
                  </span>
                  {hasPending && (
                    <span className={`w-2 h-2 rounded-full ${selected ? 'bg-orange-300' : 'bg-orange-400'}`} />
                  )}
                </div>
              )}
              {count === 0 && hasPending && (
                <span className={`mt-1 w-2 h-2 rounded-full ${selected ? 'bg-orange-300' : 'bg-orange-400'}`} />
              )}
              {count === 0 && !hasPending && <span className="mt-1 h-[18px]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
