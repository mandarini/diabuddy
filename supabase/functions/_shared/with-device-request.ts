import { defineComposite } from '@supabase/middleware';
import { withCors } from '@supabase/middleware/cors';
import { withSupabase } from '@supabase/server';
import { withPushSubscription } from './with-push-subscription.ts';

// Comma-separated list in the ALLOWED_ORIGINS function secret; the dev server origin is the fallback.
export const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// The stack every endpoint acting on the caller's own device shares: the preflight is
// answered ahead of the auth gate, the client is RLS-scoped, and the device row is resolved.
// `cors` is plumbing — handlers never read `ctx.cors`, so it stays inside the composite.
export const withDeviceRequest = defineComposite({
  build: (_config: void) =>
    [
      withCors({ origin: ALLOWED_ORIGINS, methods: ['POST'] }),
      // Untyped client: withPushSubscription narrows the one row it reads.
      withSupabase<any>({ auth: 'user', cors: 'disabled' }),
      withPushSubscription(),
    ] as const,
  internal: ['cors'],
});
