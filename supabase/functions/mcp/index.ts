// `pg` and `@modelcontextprotocol/server` are optional peers of @supabase/server; root imports
// are what let Deno resolve them for the postgres entry and the generated tools.
import 'pg';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { pipeline } from '@supabase/middleware';
import { withOAuthProtectedResource, withSupabase } from '@supabase/server';
import { generateTools, registerTools } from '@supabase/server/mcp';
import { withPostgresClient } from '@supabase/server/middleware/postgres';
import { registerDiabuddyTools } from './tools.ts';

// Device plumbing and rollout state are not assistant material; deletions stay in the app.
const HIDDEN_TABLES = new Set(['push_subscriptions', 'feature_flags']);

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
      const handler = createMcpHandler(async () => {
        const server = new McpServer({ name: 'diabuddy', version: '0.1.0' });

        // Generated from the PostgREST description with the caller's token, so only tables the
        // caller's role can reach appear, and every call runs under RLS.
        const generated = await generateTools(ctx.supabase);
        for (const [key, tool] of Object.entries(generated)) {
          if (HIDDEN_TABLES.has(tool._meta.name) || tool.name.startsWith('delete_')) {
            delete generated[key];
          }
        }
        registerTools(server, generated);

        registerDiabuddyTools(server, ctx.supabase, ctx.postgres);
        return server;
      });
      return handler.fetch(req);
    },
  ),
};
