// `pg` and `@modelcontextprotocol/server` are optional peers of @supabase/server; root imports
// are what let Deno resolve them for the postgres entry and the generated tools.
import 'pg';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { pipeline } from '@supabase/middleware';
import { withOAuthProtectedResource, withSupabase } from '@supabase/server';
import { withPostgresClient } from '@supabase/server/middleware/postgres';
import { buildServer } from './server.ts';

export default {
  fetch: pipeline(
    [
      // Answers the token-less OAuth discovery request, so it has to run before the auth gate.
      withOAuthProtectedResource(),
      // Untyped client: tools narrow what they read.
      withSupabase<any>({ auth: 'user' }),
      withPostgresClient(),
    ],
    async (req, ctx) => {
      const handler = createMcpHandler(() => buildServer(ctx.supabase, ctx.supabaseAdmin, ctx.postgres));
      return handler.fetch(req);
    },
  ),
};
