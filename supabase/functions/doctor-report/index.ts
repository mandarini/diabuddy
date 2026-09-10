// `pg` is an optional peer of @supabase/server; a root import is what lets Deno resolve it
// for the postgres entry.
import 'pg';
import { pipeline } from '@supabase/middleware';
import { withCors } from '@supabase/middleware/cors';
import { withFeatureFlag } from '@supabase/middleware/feature-flag';
import { withSupabase } from '@supabase/server';
import { withPostgresClient } from '@supabase/server/middleware/postgres';
import { createClient } from '@supabase/supabase-js';
import { fetchDoctorReportRows, renderDoctorCsv } from '../_shared/doctor-report.ts';
import { ALLOWED_ORIGINS } from '../_shared/with-device-request.ts';

const FLAG = 'doctor-report';

// `evaluate` only sees the request, so the flag is read with a client scoped by the caller's own
// token: PostgREST verifies it and RLS returns just that user's row.
function publishableKey(): string {
  const keys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (keys) return JSON.parse(keys).default;
  return Deno.env.get('SUPABASE_ANON_KEY')!;
}

async function flagEnabledFor(req: Request): Promise<boolean> {
  const authorization = req.headers.get('Authorization');
  if (!authorization) return false;
  const client = createClient(Deno.env.get('SUPABASE_URL')!, publishableKey(), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await client
    .from('feature_flags')
    .select('enabled')
    .eq('flag', FLAG)
    .maybeSingle();
  return data?.enabled === true;
}

export default {
  fetch: pipeline(
    [
      withCors({ origin: ALLOWED_ORIGINS, methods: ['POST'] }),
      withSupabase<any>({ auth: 'user', cors: 'disabled' }),
      withFeatureFlag({ name: FLAG, evaluate: flagEnabledFor }),
      withPostgresClient(),
    ],
    async (_req, ctx) => {
      const rows = await fetchDoctorReportRows(ctx.postgres);
      return new Response(renderDoctorCsv(rows), {
        headers: { 'Content-Type': 'text/csv; charset=utf-8' },
      });
    },
  ),
};
