// `pg` is an optional peer of @supabase/server; the root import is what lets Deno resolve it for
// the postgres entry.
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
      const handler = createMcpHandler(() => buildServer(ctx.supabase, ctx.postgres), {
        // Factory errors surface as a bare 500 otherwise; logging them puts them in the function logs.
        onerror: (error) => console.error('MCP request failed', error),
      });
      return handler.fetch(req);
    },
  ),
};
