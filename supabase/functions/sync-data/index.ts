import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SyncRequest {
  type: 'import_users' | 'import_products' | 'import_appointments' | 'export_sales';
  country_code: string;
  data?: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, country_code, data }: SyncRequest = await req.json();

    const logId = await createLog(supabase, type, country_code);

    let result;
    switch (type) {
      case 'import_users':
        result = await importUsers(supabase, country_code, data, logId);
        break;
      case 'import_products':
        result = await importProducts(supabase, country_code, data, logId);
        break;
      case 'import_appointments':
        result = await importAppointments(supabase, country_code, data, logId);
        break;
      case 'export_sales':
        result = await exportSales(supabase, country_code, logId);
        break;
      default:
        throw new Error('Invalid sync type');
    }

    await updateLog(supabase, logId, 'success', result);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
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

async function createLog(supabase: any, type: string, country_code: string) {
  const { data, error } = await supabase
    .from('import_export_logs')
    .insert({
      type,
      country_code,
      filename: `${type}_${Date.now()}`,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

async function updateLog(supabase: any, logId: string, status: string, result: any) {
  const { error } = await supabase
    .from('import_export_logs')
    .update({
      status,
      completed_at: new Date().toISOString(),
      rows_processed: result.processed || 0,
      rows_success: result.success || 0,
      rows_error: result.errors || 0,
      error_message: result.error || null,
    })
    .eq('id', logId);

  if (error) console.error('Error updating log:', error);
}

async function importUsers(supabase: any, country_code: string, data: any[], logId: string) {
  let processed = 0;
  let success = 0;
  let errors = 0;

  for (const row of data) {
    processed++;
    try {
      const { error } = await supabase
        .from('user_codes')
        .upsert({
          code: row.code,
          first_name: row.first_name,
          last_name: row.last_name,
          country_code,
        }, {
          onConflict: 'code',
        });

      if (error) throw error;
      success++;
    } catch (error) {
      errors++;
      await supabase.from('import_errors').insert({
        log_id: logId,
        row_number: processed,
        error_message: error.message,
        raw_data: row,
      });
    }
  }

  return { processed, success, errors };
}

async function importProducts(supabase: any, country_code: string, data: any[], logId: string) {
  let processed = 0;
  let success = 0;
  let errors = 0;

  for (const row of data) {
    processed++;
    try {
      let categoryId;
      const { data: existingCategory } = await supabase
        .from('product_categories')
        .select('id')
        .eq('code', row.category_code)
        .eq('country_code', country_code)
        .maybeSingle();

      if (existingCategory) {
        categoryId = existingCategory.id;
      } else {
        const { data: newCategory, error: catError } = await supabase
          .from('product_categories')
          .insert({
            code: row.category_code,
            name: row.category_name,
            country_code,
            display_order: row.display_order || 0,
          })
          .select()
          .single();

        if (catError) throw catError;
        categoryId = newCategory.id;
      }

      const { error } = await supabase
        .from('products')
        .upsert({
          code: row.code,
          name: row.name,
          category_id: categoryId,
          price: parseFloat(row.price),
          country_code,
        }, {
          onConflict: 'code,country_code',
        });

      if (error) throw error;
      success++;
    } catch (error) {
      errors++;
      await supabase.from('import_errors').insert({
        log_id: logId,
        row_number: processed,
        error_message: error.message,
        raw_data: row,
      });
    }
  }

  return { processed, success, errors };
}

async function importAppointments(supabase: any, country_code: string, data: any[], logId: string) {
  let processed = 0;
  let success = 0;
  let errors = 0;

  for (const row of data) {
    processed++;
    try {
      const { data: userCode } = await supabase
        .from('user_codes')
        .select('id')
        .eq('code', row.user_code)
        .maybeSingle();

      if (!userCode) {
        throw new Error(`User code ${row.user_code} not found`);
      }

      const { error } = await supabase
        .from('appointments')
        .upsert({
          external_id: row.external_id,
          user_code_id: userCode.id,
          country_code,
          appointment_date: row.date,
          appointment_time: row.time,
          store_name: row.store_name,
          store_address: row.store_address,
          store_city: row.store_city,
          store_postal_code: row.store_postal_code,
          notes: row.notes,
        }, {
          onConflict: 'external_id,country_code',
        });

      if (error) throw error;
      success++;
    } catch (error) {
      errors++;
      await supabase.from('import_errors').insert({
        log_id: logId,
        row_number: processed,
        error_message: error.message,
        raw_data: row,
      });
    }
  }

  return { processed, success, errors };
}

async function exportSales(supabase: any, country_code: string, logId: string) {
  const { data: reports, error } = await supabase
    .from('sales_reports')
    .select(`
      *,
      lines:sales_report_lines(*,product:products(*)),
      appointment:appointments(*),
      user:users(*)
    `)
    .eq('country_code', country_code)
    .eq('status', 'validated')
    .eq('exported', false);

  if (error) throw error;

  const exportData = reports.map((report: any) => ({
    report_id: report.id,
    appointment_external_id: report.appointment.external_id,
    user_code: report.user.user_code_id,
    date: report.appointment.appointment_date,
    total_amount: report.total_amount,
    comment: report.comment,
    lines: report.lines.map((line: any) => ({
      product_code: line.product.code,
      quantity: line.quantity,
      unit_price: line.unit_price,
      line_amount: line.line_amount,
    })),
  }));

  const reportIds = reports.map((r: any) => r.id);
  if (reportIds.length > 0) {
    await supabase
      .from('sales_reports')
      .update({
        exported: true,
        exported_at: new Date().toISOString(),
      })
      .in('id', reportIds);
  }

  return {
    processed: reports.length,
    success: reports.length,
    errors: 0,
    data: exportData,
  };
}
