import type { McpServer } from '@modelcontextprotocol/server';
import type { PostgresApi } from '@supabase/server/middleware/postgres';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod/v4';
import { fetchDoctorReportRows, renderDoctorCsv } from '../_shared/doctor-report.ts';

const MEAL_SLOTS = ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'other'] as const;

// Foods come back as names and category names in place of ids.
const MEAL_SELECT =
  'id, eaten_at, meal_slot, main_meal, glucose_1h_mg_dl, glucose_measured_at, glucose_followup_mg_dl, glucose_followup_measured_at, walked_after, walk_minutes, notes, ' +
  'meal_carbs(quantity, unit, notes, food:foods(name, category:categories(name))), ' +
  'meal_pairings(quantity, unit, notes, food:foods(name, category:categories(name)))';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

function json(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

// `from` and `to` are calendar days in the user's timezone; Postgres turns their midnights into
// instants so the PostgREST filter on `eaten_at` matches what the app shows for those days.
async function dayWindow(sql: PostgresApi, from: string, to: string) {
  const rows: { start: string; end: string }[] = await sql.query`
    with tz as (
      select coalesce((select timezone from public.user_settings limit 1), 'Europe/Athens') as name
    )
    select (${from}::date::timestamp at time zone (select name from tz))::text as start,
           ((${to}::date + 1)::timestamp at time zone (select name from tz))::text as end
  `;
  return rows[0];
}

// Every tool reads through the caller's own client or SQL connection, so RLS decides what is
// visible and no tool takes a user id.
export function registerDiabuddyTools(server: McpServer, supabase: SupabaseClient<any>, sql: PostgresApi) {
  server.registerTool(
    'list_meals',
    {
      title: 'List meals',
      description:
        'Meals the user logged between two dates (inclusive, in their timezone), newest first, with the foods eaten and the 1-hour glucose reading when recorded. Raw entries only; use glucose_summary for averages.',
      inputSchema: z.object({
        from: isoDate.describe('First day, YYYY-MM-DD'),
        to: isoDate.describe('Last day, YYYY-MM-DD'),
        slot: z.enum(MEAL_SLOTS).optional().describe('Only meals in this slot'),
        limit: z.number().int().min(1).max(200).default(50),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ from, to, slot, limit }) => {
      const window = await dayWindow(sql, from, to);
      let query = supabase
        .from('meal_entries')
        .select(MEAL_SELECT)
        .gte('eaten_at', window.start)
        .lt('eaten_at', window.end)
        .order('eaten_at', { ascending: false })
        .limit(limit);
      if (slot) query = query.eq('meal_slot', slot);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return json(data);
    },
  );

  server.registerTool(
    'get_meal',
    {
      title: 'Get meal',
      description: 'One meal by id, with its foods and readings.',
      inputSchema: z.object({ id: z.uuid() }),
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => {
      const { data, error } = await supabase.from('meal_entries').select(MEAL_SELECT).eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error(`Meal ${id} not found`);
      return json(data);
    },
  );

  server.registerTool(
    'list_daily_metrics',
    {
      title: 'List daily metrics',
      description:
        'Fasting glucose, morning and evening blood pressure and pulse, and weight, one row per day between two dates (inclusive), newest first.',
      inputSchema: z.object({
        from: isoDate.describe('First day, YYYY-MM-DD'),
        to: isoDate.describe('Last day, YYYY-MM-DD'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ from, to }) => {
      const { data, error } = await supabase
        .from('daily_metrics')
        .select('*')
        .gte('metric_date', from)
        .lte('metric_date', to)
        .order('metric_date', { ascending: false });
      if (error) throw new Error(error.message);
      return json(data);
    },
  );

  server.registerTool(
    'glucose_summary',
    {
      title: 'Glucose summary',
      description:
        "Averages over the last N days: 1-hour post-meal glucose per meal slot (count, avg, min, max, count above the user's target), fasting glucose (count, avg, count above target), and post-meal averages with and without a walk. Targets come from the user's settings.",
      inputSchema: z.object({ days: z.number().int().min(1).max(365).default(14) }),
      annotations: { readOnlyHint: true },
    },
    async ({ days }) => {
      const [summary] = await sql.query`
        with s as (
          select coalesce((select postmeal_1h_target_max from public.user_settings limit 1), 140) as postmeal_target,
                 coalesce((select fasting_target_max from public.user_settings limit 1), 95) as fasting_target
        ),
        meals as (
          select meal_slot, glucose_1h_mg_dl, walked_after
          from public.meal_entries
          where eaten_at >= now() - ${days}::int * interval '1 day' and glucose_1h_mg_dl is not null
        ),
        metrics as (
          select fasting_glucose_mg_dl
          from public.daily_metrics
          where metric_date >= (now() - ${days}::int * interval '1 day')::date and fasting_glucose_mg_dl is not null
        ),
        per_slot as (
          select meal_slot as slot,
                 count(*) as n,
                 round(avg(glucose_1h_mg_dl), 1) as avg,
                 min(glucose_1h_mg_dl) as min,
                 max(glucose_1h_mg_dl) as max,
                 count(*) filter (where glucose_1h_mg_dl > (select postmeal_target from s)) as above_target
          from meals
          group by meal_slot
        )
        select
          ${days}::int as days,
          (select json_agg(json_build_object(
              'slot', slot, 'count', n, 'avg', avg, 'min', min, 'max', max, 'above_target', above_target
            ) order by slot) from per_slot) as post_meal_by_slot,
          (select json_build_object(
              'count', count(*),
              'avg', round(avg(fasting_glucose_mg_dl), 1),
              'above_target', count(*) filter (where fasting_glucose_mg_dl > (select fasting_target from s))
            ) from metrics) as fasting,
          (select json_build_object(
              'walked_avg', round(avg(glucose_1h_mg_dl) filter (where walked_after), 1),
              'not_walked_avg', round(avg(glucose_1h_mg_dl) filter (where not walked_after), 1)
            ) from meals) as walking,
          (select postmeal_target from s) as postmeal_target,
          (select fasting_target from s) as fasting_target
      `;
      return json(summary);
    },
  );

  server.registerTool(
    'doctor_report',
    {
      title: 'Doctor report (CSV)',
      description:
        'The doctor-format log as CSV: one row per day with fasting glucose, 1-hour readings after breakfast, lunch and dinner, morning and evening blood pressure, notes, and weight once per 7-day block. Whole history unless days is given.',
      inputSchema: z.object({ days: z.number().int().min(1).max(365).optional() }),
      annotations: { readOnlyHint: true },
    },
    async ({ days }) => {
      const rows = await fetchDoctorReportRows(sql, days);
      return { content: [{ type: 'text' as const, text: renderDoctorCsv(rows) }] };
    },
  );
}
