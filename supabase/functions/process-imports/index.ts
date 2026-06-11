import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BATCH_SIZE = 500;

interface ProcessRequest {
  countryCode: string;
  fileType: 'users' | 'products' | 'appointments';
  fileContent: string;
  filename: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { countryCode, fileType, fileContent, filename }: ProcessRequest = await req.json();

    const logTypeMap = {
      users: 'import_users',
      products: 'import_products',
      appointments: 'import_appointments',
    } as const;

    const { data: logEntry, error: logError } = await supabase
      .from('import_export_logs')
      .insert({
        type: logTypeMap[fileType],
        country_code: countryCode,
        filename,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) throw logError;

    let result;
    try {
      switch (fileType) {
        case 'users':
          result = await processUsers(supabase, fileContent, countryCode, logEntry.id);
          break;
        case 'products':
          result = await processProducts(supabase, fileContent, countryCode, logEntry.id);
          break;
        case 'appointments':
          result = await processAppointments(supabase, fileContent, countryCode, logEntry.id);
          break;
        default:
          throw new Error(`Unknown file type: ${fileType}`);
      }

      await supabase
        .from('import_export_logs')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
          rows_processed: result.processed,
          rows_success: result.success,
          rows_error: result.errors,
        })
        .eq('id', logEntry.id);

      return new Response(
        JSON.stringify({
          success: true,
          logId: logEntry.id,
          result,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      await supabase
        .from('import_export_logs')
        .update({
          status: 'error',
          completed_at: new Date().toISOString(),
          error_message: error.message,
        })
        .eq('id', logEntry.id);

      throw error;
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

async function batchInsertErrors(supabase: any, logId: string, errorItems: any[]) {
  for (let i = 0; i < errorItems.length; i += BATCH_SIZE) {
    await supabase.from('import_errors').insert(errorItems.slice(i, i + BATCH_SIZE));
  }
}

async function processUsers(supabase: any, content: string, countryCode: string, logId: string) {
  const lines = content.trim().split('\n');
  let processed = 0;
  let success = 0;
  let errors = 0;
  const errorItems: any[] = [];
  const upsertRows: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    processed++;
    const fields = line.split(';');

    try {
      if (fields.length < 4) {
        throw new Error('Invalid format: not enough fields');
      }

      const code = fields[0].trim();
      const lastName = fields[1].trim();
      const firstName = fields[2].trim();
      const isActive = fields[3].trim() === '1';

      upsertRows.push({
        code,
        first_name: firstName,
        last_name: lastName,
        country_code: countryCode,
        is_active: isActive,
        is_activated: false,
      });
    } catch (error) {
      errors++;
      errorItems.push({
        log_id: logId,
        row_number: i + 1,
        error_message: error.message,
        raw_data: { line },
      });
    }
  }

  for (let i = 0; i < upsertRows.length; i += BATCH_SIZE) {
    const batch = upsertRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('user_codes')
      .upsert(batch, {
        onConflict: 'code,country_code',
        ignoreDuplicates: false,
      });

    if (error) {
      errors += batch.length;
      errorItems.push({
        log_id: logId,
        row_number: i + 1,
        error_message: error.message,
        raw_data: { batch_start: i, batch_end: i + batch.length },
      });
    } else {
      success += batch.length;
    }
  }

  if (errorItems.length > 0) {
    await batchInsertErrors(supabase, logId, errorItems);
  }

  return { processed, success, errors };
}

async function processProducts(supabase: any, content: string, countryCode: string, logId: string) {
  const lines = content.trim().split('\n');
  let processed = 0;
  let success = 0;
  let errors = 0;
  const errorItems: any[] = [];

  const { data: existingCategories } = await supabase
    .from('product_categories')
    .select('id, code')
    .eq('country_code', countryCode);

  const categoryMap = new Map<string, string>(
    (existingCategories || []).map((c: any) => [c.code, c.id])
  );

  const newCategoryRows: any[] = [];
  const categoryCodesNeeded = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = line.split(';');
    if (fields.length >= 5) {
      const categoryCode = fields[3].trim();
      const categoryName = fields[4].trim();
      if (categoryCode && categoryName && !categoryMap.has(categoryCode) && !categoryCodesNeeded.has(categoryCode)) {
        categoryCodesNeeded.add(categoryCode);
        newCategoryRows.push({ code: categoryCode, name: categoryName, country_code: countryCode });
      }
    }
  }

  if (newCategoryRows.length > 0) {
    const { data: inserted } = await supabase
      .from('product_categories')
      .insert(newCategoryRows)
      .select('id, code');
    (inserted || []).forEach((c: any) => categoryMap.set(c.code, c.id));
  }

  const upsertRows: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    processed++;
    const fields = line.split(';');

    try {
      if (fields.length < 7) {
        throw new Error('Invalid format: not enough fields');
      }

      const code = fields[0].trim();
      const ean = fields[1].trim();
      const name = fields[2].trim();
      const categoryCode = fields[3].trim();
      const price = parseFloat(fields[5].trim());
      const isActive = fields[6].trim() === '1';

      if (!categoryCode) {
        throw new Error('Product must have a category');
      }

      const categoryId = categoryMap.get(categoryCode);
      if (!categoryId) {
        throw new Error(`Category ${categoryCode} not found`);
      }

      upsertRows.push({
        code,
        name,
        ean,
        category_id: categoryId,
        price,
        country_code: countryCode,
        active: isActive,
      });
    } catch (error) {
      errors++;
      errorItems.push({
        log_id: logId,
        row_number: i + 1,
        error_message: error.message,
        raw_data: { line },
      });
    }
  }

  for (let i = 0; i < upsertRows.length; i += BATCH_SIZE) {
    const batch = upsertRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('products')
      .upsert(batch, {
        onConflict: 'code,country_code',
        ignoreDuplicates: false,
      });

    if (error) {
      errors += batch.length;
      errorItems.push({
        log_id: logId,
        row_number: i + 1,
        error_message: error.message,
        raw_data: { batch_start: i, batch_end: i + batch.length },
      });
    } else {
      success += batch.length;
    }
  }

  if (errorItems.length > 0) {
    await batchInsertErrors(supabase, logId, errorItems);
  }

  return { processed, success, errors };
}

async function upsertCustomersFromAppointments(
  supabase: any,
  rows: any[],
  countryCode: string
): Promise<Map<string, string>> {
  const customerMap = new Map<string, string>();
  const uniqueCustomers = new Map<string, any>();

  for (const row of rows) {
    if (!row.erp_code) continue;
    uniqueCustomers.set(row.erp_code, {
      name: row.store_name,
      country_code: countryCode,
      erp_code: row.erp_code,
      old_crm_code: row.old_crm_code,
      phone: row.phone,
      address: row.store_address,
      city: row.store_city,
      postal_code: row.store_postal_code,
      source: 'import',
      type: 'client',
    });
  }

  const customerRows = Array.from(uniqueCustomers.values());
  if (customerRows.length === 0) return customerMap;

  for (let i = 0; i < customerRows.length; i += BATCH_SIZE) {
    const batch = customerRows.slice(i, i + BATCH_SIZE);
    await supabase
      .from('customers')
      .upsert(batch, {
        onConflict: 'erp_code,country_code',
        ignoreDuplicates: false,
      });
  }

  const erpCodes = Array.from(uniqueCustomers.keys());
  const { data: customers } = await supabase
    .from('customers')
    .select('id, erp_code')
    .eq('country_code', countryCode)
    .in('erp_code', erpCodes);

  for (const c of customers || []) {
    customerMap.set(c.erp_code, c.id);
  }

  return customerMap;
}

async function processAppointments(supabase: any, content: string, countryCode: string, logId: string) {
  const lines = content.trim().split('\n');
  let processed = 0;
  let success = 0;
  let errors = 0;
  const errorItems: any[] = [];

  const { data: userCodesData } = await supabase
    .from('user_codes')
    .select('id, code')
    .eq('country_code', countryCode);

  const userCodeMap = new Map<string, string>(
    (userCodesData || []).map((u: any) => [u.code, u.id])
  );

  const upsertRows: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    processed++;
    const fields = line.split(';');

    try {
      if (fields.length < 13) {
        throw new Error('Invalid format: not enough fields');
      }

      const externalId = fields[0].trim();
      const userCode = fields[1].trim();
      const storeName = fields[2].trim();
      const dateStr = fields[3].trim();
      const timeStr = fields[4].trim();
      const durationStr = fields[5]?.trim() || null;
      const phone = fields[6]?.trim() || null;
      const address1 = fields[7]?.trim() || null;
      const address2 = fields[8]?.trim() || null;
      const postalCode = fields[9]?.trim() || null;
      const city = fields[10]?.trim() || null;
      const oldCrmCode = fields[11]?.trim() || null;
      const erpCode = fields[12]?.trim() || null;
      const typeIndicator = fields[13]?.trim() || null;

      const userCodeId = userCodeMap.get(userCode);
      if (!userCodeId) {
        throw new Error(`User code ${userCode} not found`);
      }

      const appointmentDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
      const startHour = parseInt(timeStr.substring(0, 2), 10);
      const startMin = parseInt(timeStr.substring(2, 4), 10);
      const appointmentTime = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`;

      let appointmentEndTime: string | null = null;
      if (durationStr) {
        const durationHours = parseInt(durationStr, 10);
        if (!isNaN(durationHours) && durationHours > 0) {
          const totalMinutes = startHour * 60 + startMin + durationHours * 60;
          const endHour = Math.floor(totalMinutes / 60) % 24;
          const endMin = totalMinutes % 60;
          appointmentEndTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;
        }
      }

      const typeMap: Record<string, string> = { '1': 'animation', '2': 'formation', '3': 'rdv_passage' };
      const appointmentType = typeIndicator ? (typeMap[typeIndicator] || null) : null;

      const storeAddress = [address1, address2].filter(Boolean).join(', ') || null;

      upsertRows.push({
        external_id: externalId,
        user_code_id: userCodeId,
        country_code: countryCode,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        appointment_end_time: appointmentEndTime,
        appointment_type: appointmentType,
        store_name: storeName,
        store_address: storeAddress,
        store_city: city,
        store_postal_code: postalCode,
        old_crm_code: oldCrmCode,
        erp_code: erpCode,
        phone: phone,
        status: 'scheduled',
      });
    } catch (error) {
      errors++;
      errorItems.push({
        log_id: logId,
        row_number: i + 1,
        error_message: error.message,
        raw_data: { line },
      });
    }
  }

  const customerMap = await upsertCustomersFromAppointments(supabase, upsertRows, countryCode);

  const upsertRowsWithCustomer = upsertRows.map((row) => ({
    ...row,
    customer_id: row.erp_code ? (customerMap.get(row.erp_code) || null) : null,
  }));

  for (let i = 0; i < upsertRowsWithCustomer.length; i += BATCH_SIZE) {
    const batch = upsertRowsWithCustomer.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('appointments')
      .upsert(batch, {
        onConflict: 'external_id,country_code',
        ignoreDuplicates: false,
      });

    if (error) {
      errors += batch.length;
      errorItems.push({
        log_id: logId,
        row_number: i + 1,
        error_message: error.message,
        raw_data: { batch_start: i, batch_end: i + batch.length },
      });
    } else {
      success += batch.length;
    }
  }

  if (errorItems.length > 0) {
    await batchInsertErrors(supabase, logId, errorItems);
  }

  const dates = [...new Set(upsertRows.map(r => r.appointment_date))];
  const userCodeIds = [...new Set(upsertRows.map(r => r.user_code_id))];
  const cancelled = await deduplicateOverlappingAppointments(supabase, countryCode, userCodeIds, dates);

  return { processed, success, errors, duplicates_cancelled: cancelled };
}

function addOneHour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const totalMin = h * 60 + m + 60;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:00`;
}

async function deduplicateOverlappingAppointments(
  supabase: any,
  countryCode: string,
  userCodeIds: string[],
  dates: string[]
): Promise<number> {
  if (userCodeIds.length === 0 || dates.length === 0) return 0;

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, user_code_id, appointment_date, appointment_time, appointment_end_time, created_at, external_id')
    .eq('country_code', countryCode)
    .eq('status', 'scheduled')
    .in('user_code_id', userCodeIds)
    .in('appointment_date', dates);

  if (!appointments || appointments.length === 0) return 0;

  const { data: reportsData } = await supabase
    .from('sales_reports')
    .select('appointment_id')
    .in('appointment_id', appointments.map((a: any) => a.id));

  const protectedIds = new Set((reportsData || []).map((r: any) => r.appointment_id));

  const grouped = new Map<string, any[]>();
  for (const apt of appointments) {
    const key = `${apt.user_code_id}|${apt.appointment_date}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(apt);
  }

  const toCancel = new Set<string>();

  for (const group of grouped.values()) {
    if (group.length < 2) continue;
    group.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    for (let i = 0; i < group.length; i++) {
      if (protectedIds.has(group[i].id) || toCancel.has(group[i].id)) continue;

      for (let j = i + 1; j < group.length; j++) {
        if (protectedIds.has(group[j].id) || toCancel.has(group[j].id)) continue;

        const startA = group[i].appointment_time;
        const endA = group[i].appointment_end_time || addOneHour(startA);
        const startB = group[j].appointment_time;
        const endB = group[j].appointment_end_time || addOneHour(startB);

        if (startA < endB && startB < endA) {
          toCancel.add(group[j].id);
        }
      }
    }
  }

  const cancelIds = [...toCancel];
  if (cancelIds.length > 0) {
    for (let i = 0; i < cancelIds.length; i += BATCH_SIZE) {
      const batch = cancelIds.slice(i, i + BATCH_SIZE);
      await supabase
        .from('appointments')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .in('id', batch);
    }
  }

  return cancelIds.length;
}
