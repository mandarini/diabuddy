import type { PostgresApi } from '@supabase/server/middleware/postgres';

const WEIGHT_BLOCK_DAYS = 7;

const CSV_HEADER =
  'ΗΜ/ΝΙΑ,Πρωί νηστική,1 ώρα μετά το πρωινό,1 ώρα μετά μεσημεριανού,1 ώρα μετά το βραδινό,Αρτηριακή πίεση πρωί,Αρτηριακή πίεση απόγευμα,Σημειώσεις';

export interface ReportRow {
  day: string;
  fasting: number | null;
  breakfast_1h: string | null;
  lunch_1h: string | null;
  dinner_1h: string | null;
  morning_sys: number | null;
  morning_dia: number | null;
  evening_sys: number | null;
  evening_dia: number | null;
  day_notes: string | null;
  meal_notes: string | null;
  block_weight: number | null;
}

function csvField(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function formatBP(systolic: number | null, diastolic: number | null): string {
  return systolic != null && diastolic != null ? `${systolic}/${diastolic}` : '';
}

export function renderDoctorCsv(rows: ReportRow[]): string {
  const lines = [CSV_HEADER];
  for (const row of rows) {
    const notes = [row.day_notes, row.meal_notes].filter(Boolean);
    if (row.block_weight != null) notes.push(`ΣΒ: ${row.block_weight}`);
    lines.push(
      [
        row.day,
        row.fasting ?? '',
        row.breakfast_1h ?? '',
        row.lunch_1h ?? '',
        row.dinner_1h ?? '',
        formatBP(row.morning_sys, row.morning_dia),
        formatBP(row.evening_sys, row.evening_dia),
        notes.join('; '),
      ]
        .map(csvField)
        .join(','),
    );
  }
  return lines.join('\n');
}

// Every table here is RLS-scoped to the caller, so no user predicate appears in the SQL.
// Days are the union of meal days (in the user's timezone) and daily-metric dates; weights
// are reported once per 7-day block, on the block's last day. Blocks are numbered over the
// whole history, so a `days` window only trims which rows are returned.
export async function fetchDoctorReportRows(sql: PostgresApi, days?: number): Promise<ReportRow[]> {
  const since =
    days == null ? null : new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const rows: ReportRow[] = await sql.query`
    with tz as (
      select coalesce((select timezone from public.user_settings limit 1), 'Europe/Athens') as name
    ),
    meal_days as (
      select (m.eaten_at at time zone (select name from tz))::date as day,
             m.meal_slot, m.glucose_1h_mg_dl, m.notes, m.eaten_at
      from public.meal_entries m
    ),
    days as (
      select day from meal_days
      union
      select metric_date from public.daily_metrics
    ),
    blocks as (
      select day, (row_number() over (order by day) - 1) / ${WEIGHT_BLOCK_DAYS}::int as block
      from days
    ),
    block_weights as (
      select max(b.day) as block_end,
             (array_agg(dm.weight_kg::float8 order by dm.metric_date desc)
                filter (where dm.weight_kg is not null))[1] as weight_kg
      from blocks b
      left join public.daily_metrics dm on dm.metric_date = b.day
      group by b.block
    )
    select d.day::text as day,
           dm.fasting_glucose_mg_dl as fasting,
           (select string_agg(md.glucose_1h_mg_dl::text, '; ' order by md.eaten_at)
              from meal_days md where md.day = d.day and md.meal_slot = 'breakfast'
               and md.glucose_1h_mg_dl is not null) as breakfast_1h,
           (select string_agg(md.glucose_1h_mg_dl::text, '; ' order by md.eaten_at)
              from meal_days md where md.day = d.day and md.meal_slot = 'lunch'
               and md.glucose_1h_mg_dl is not null) as lunch_1h,
           (select string_agg(md.glucose_1h_mg_dl::text, '; ' order by md.eaten_at)
              from meal_days md where md.day = d.day and md.meal_slot = 'dinner'
               and md.glucose_1h_mg_dl is not null) as dinner_1h,
           dm.morning_bp_systolic as morning_sys,
           dm.morning_bp_diastolic as morning_dia,
           dm.evening_bp_systolic as evening_sys,
           dm.evening_bp_diastolic as evening_dia,
           nullif(dm.notes, '') as day_notes,
           (select string_agg(md.notes, '; ' order by md.eaten_at)
              from meal_days md where md.day = d.day and nullif(md.notes, '') is not null) as meal_notes,
           bw.weight_kg as block_weight
    from days d
    left join public.daily_metrics dm on dm.metric_date = d.day
    left join block_weights bw on bw.block_end = d.day
    where (${since}::date is null or d.day >= ${since}::date)
    order by d.day desc
  `;
  return rows;
}
