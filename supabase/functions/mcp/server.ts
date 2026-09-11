import { McpServer } from '@modelcontextprotocol/server';
import type { PostgresApi } from '@supabase/server/middleware/postgres';
import type { SupabaseClient } from '@supabase/supabase-js';
import { registerDiabuddyTools } from './tools.ts';

// One server per request. `supabase` is the caller's RLS-scoped client and `sql` the caller's SQL
// connection, so every tool sees exactly what that user sees in the app.
export function buildServer(supabase: SupabaseClient<any>, sql: PostgresApi): McpServer {
  const server = new McpServer({ name: 'diabuddy', version: '0.1.0' });
  registerDiabuddyTools(server, supabase, sql);
  return server;
}
