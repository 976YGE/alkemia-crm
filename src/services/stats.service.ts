import { supabase } from '../lib/supabase';

export interface MonthlyStats {
  month: number;
  animations: number;
  totalRevenue: number;
  avgRevenue: number;
  noSaleCount: number;
}

export interface YearStats {
  year: number;
  months: MonthlyStats[];
  totalAnimations: number;
  totalRevenue: number;
  avgRevenue: number;
  noSaleCount: number;
  noSaleRate: number;
  lastQuarterAvg: number;
}

export interface AnimatorStats {
  userId: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  animations: number;
  totalRevenue: number;
  avgRevenue: number;
  noSaleCount: number;
}

export interface AnimatorOption {
  userId: string;
  firstName: string;
  lastName: string;
  countryCode: string;
}

export class StatsService {
  static async getMonthlyStats(params: {
    year: number;
    userId?: string;
    countryCode?: string;
  }): Promise<MonthlyStats[]> {
    const { year, userId, countryCode } = params;

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    let query = supabase
      .from('sales_reports')
      .select('total_amount, is_no_sale, validated_at, appointments!inner(appointment_date, user_code_id)')
      .eq('status', 'validated')
      .gte('appointments.appointment_date', startDate)
      .lte('appointments.appointment_date', endDate);

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (countryCode) {
      query = query.eq('country_code', countryCode);
    }

    const { data, error } = await query;

    if (error) throw error;

    const monthMap = new Map<number, { total: number; count: number; noSale: number }>();
    for (let m = 1; m <= 12; m++) {
      monthMap.set(m, { total: 0, count: 0, noSale: 0 });
    }

    for (const row of data || []) {
      const appt = row.appointments as unknown as { appointment_date: string };
      const month = new Date(appt.appointment_date + 'T00:00:00').getMonth() + 1;
      const entry = monthMap.get(month)!;
      entry.count += 1;
      if (row.is_no_sale) {
        entry.noSale += 1;
      } else {
        entry.total += Number(row.total_amount) || 0;
      }
    }

    return Array.from(monthMap.entries()).map(([month, d]) => ({
      month,
      animations: d.count,
      totalRevenue: Math.round(d.total * 100) / 100,
      avgRevenue: d.count - d.noSale > 0
        ? Math.round((d.total / (d.count - d.noSale)) * 100) / 100
        : 0,
      noSaleCount: d.noSale,
    }));
  }

  static buildYearStats(year: number, months: MonthlyStats[]): YearStats {
    const totalAnimations = months.reduce((s, m) => s + m.animations, 0);
    const totalRevenue = months.reduce((s, m) => s + m.totalRevenue, 0);
    const noSaleCount = months.reduce((s, m) => s + m.noSaleCount, 0);
    const salesCount = totalAnimations - noSaleCount;
    const avgRevenue = salesCount > 0 ? Math.round((totalRevenue / salesCount) * 100) / 100 : 0;
    const noSaleRate = totalAnimations > 0
      ? Math.round((noSaleCount / totalAnimations) * 1000) / 10
      : 0;

    const now = new Date();
    const currentYear = now.getFullYear();
    let q3End: number;
    let q3Start: number;

    if (year < currentYear) {
      q3End = 12;
      q3Start = 10;
    } else {
      const currentMonth = now.getMonth() + 1;
      q3End = currentMonth;
      q3Start = Math.max(1, currentMonth - 2);
    }

    const lastQMonths = months.filter(m => m.month >= q3Start && m.month <= q3End);
    const lqAnimations = lastQMonths.reduce((s, m) => s + m.animations - m.noSaleCount, 0);
    const lqRevenue = lastQMonths.reduce((s, m) => s + m.totalRevenue, 0);
    const lastQuarterAvg = lqAnimations > 0 ? Math.round((lqRevenue / lqAnimations) * 100) / 100 : 0;

    return {
      year,
      months,
      totalAnimations,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgRevenue,
      noSaleCount,
      noSaleRate,
      lastQuarterAvg,
    };
  }

  static async getAnimatorStats(params: {
    year: number;
    countryCode?: string;
  }): Promise<AnimatorStats[]> {
    const { year, countryCode } = params;

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    let query = supabase
      .from('sales_reports')
      .select('user_id, total_amount, is_no_sale, appointments!inner(appointment_date)')
      .eq('status', 'validated')
      .gte('appointments.appointment_date', startDate)
      .lte('appointments.appointment_date', endDate);

    if (countryCode) {
      query = query.eq('country_code', countryCode);
    }

    const { data, error } = await query;
    if (error) throw error;

    const userMap = new Map<string, { total: number; count: number; noSale: number }>();

    for (const row of data || []) {
      const uid = row.user_id;
      if (!userMap.has(uid)) {
        userMap.set(uid, { total: 0, count: 0, noSale: 0 });
      }
      const entry = userMap.get(uid)!;
      entry.count += 1;
      if (row.is_no_sale) {
        entry.noSale += 1;
      } else {
        entry.total += Number(row.total_amount) || 0;
      }
    }

    const userIds = Array.from(userMap.keys());
    if (userIds.length === 0) return [];

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, country_code, user_code:user_codes(first_name, last_name)')
      .in('id', userIds);

    if (usersError) throw usersError;

    const userInfoMap = new Map<string, { firstName: string; lastName: string; countryCode: string }>();
    for (const u of users || []) {
      const uc = u.user_code as unknown as { first_name: string; last_name: string } | null;
      userInfoMap.set(u.id, {
        firstName: uc?.first_name || '',
        lastName: uc?.last_name || '',
        countryCode: u.country_code,
      });
    }

    return userIds.map(uid => {
      const d = userMap.get(uid)!;
      const info = userInfoMap.get(uid);
      const salesCount = d.count - d.noSale;
      return {
        userId: uid,
        firstName: info?.firstName || '',
        lastName: info?.lastName || '',
        countryCode: info?.countryCode || '',
        animations: d.count,
        totalRevenue: Math.round(d.total * 100) / 100,
        avgRevenue: salesCount > 0 ? Math.round((d.total / salesCount) * 100) / 100 : 0,
        noSaleCount: d.noSale,
      };
    });
  }

  static async getAnimatorOptions(countryCode?: string): Promise<AnimatorOption[]> {
    let query = supabase
      .from('users')
      .select('id, country_code, user_code:user_codes(first_name, last_name)')
      .eq('role', 'animator');

    if (countryCode) {
      query = query.eq('country_code', countryCode);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(u => {
      const uc = u.user_code as unknown as { first_name: string; last_name: string } | null;
      return {
        userId: u.id,
        firstName: uc?.first_name || '',
        lastName: uc?.last_name || '',
        countryCode: u.country_code,
      };
    }).sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));
  }

  static async getCountries(): Promise<{ code: string; name: string }[]> {
    const { data, error } = await supabase
      .from('countries')
      .select('code, name')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  static getAvailableYears(): number[] {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y >= 2020; y--) {
      years.push(y);
    }
    return years;
  }
}
