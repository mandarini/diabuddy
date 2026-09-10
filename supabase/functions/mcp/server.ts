import { McpServer } from '@modelcontextprotocol/server';
import { generateTools, registerTools } from '@supabase/server/mcp';
import type { PostgresApi } from '@supabase/server/middleware/postgres';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DIABUDDY_TOOL_NAMES, registerDiabuddyTools } from './tools.ts';

// Device plumbing and rollout state are not assistant material; deletions stay in the app.
const HIDDEN_TABLES = new Set(['push_subscriptions', 'feature_flags']);
const HAND_WRITTEN = new Set<string>(DIABUDDY_TOOL_NAMES);

// One server per request. `supabase` is the caller's RLS-scoped client and `sql` the caller's SQL
// connection; `supabaseAdmin` is used for exactly one thing, reading the schema description.
export async function buildServer(
  supabase: SupabaseClient<any>,
  supabaseAdmin: SupabaseClient<any>,
  sql: PostgresApi,
): Promise<McpServer> {
  const server = new McpServer({ name: 'diabuddy', version: '0.1.0' });

  // The Data API answers its OpenAPI description only to secret API keys, so the schema is read
  // through the admin client. Every generated tool still executes through the caller's own client,
  // so what a call can see is decided by RLS, exactly as for the hand-written tools.
  const describedByAdmin = {
    from: (relation: string) => supabase.from(relation),
    rpc: (fn: string, args?: Record<string, unknown>, options?: Record<string, unknown>) =>
      supabase.rpc(fn, args, options),
    getOpenApiSpec: () => supabaseAdmin.getOpenApiSpec(),
  } as unknown as SupabaseClient<any>;

  const generated = await generateTools(describedByAdmin);
  for (const [key, tool] of Object.entries(generated)) {
    // The admin description lists database functions the caller cannot execute, and every verb of
    // every table; the hand-written tools cover what a model needs beyond plain CRUD.
    const excluded =
      HIDDEN_TABLES.has(tool._meta.name) ||
      tool._meta.kind === 'function' ||
      tool.name.startsWith('delete_') ||
      HAND_WRITTEN.has(tool.name);
    if (excluded) delete generated[key];
  }
  registerTools(server, generated);

  registerDiabuddyTools(server, supabase, sql);
  return server;
}
