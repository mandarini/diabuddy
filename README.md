# DiaBuddy

DiaBuddy is a gestational diabetes tracker for recording meals, glucose readings, activity, and daily measurements, then comparing patterns over time.

It is not a calorie counter or a comprehensive food diary. DiaBuddy focuses on foods that affect blood glucose and on building a general picture of how specific food types, pairings, and activity relate to your readings.

## What It Tracks

- Meals, meal times, notes, and the foods most relevant to glucose response
- Carbohydrate foods and fat, protein, or fiber pairings that can help contextualize a reading
- One-hour post-meal glucose readings and the time they were taken
- Whether you walked after a meal and for how long
- Fasting glucose, morning blood pressure, and evening blood pressure
- Personal fasting and one-hour post-meal glucose targets
- Estimated due date, gestational age, and days until the due date

## Features

- **Food library:** Choose from curated carbohydrate and pairing categories, use common foods as quick selections, or add a personal food when it is not listed.
- **Today:** Log today's meals and daily measurements from one screen.
- **History:** Search and filter previous meals by meal slot or carbohydrate category, then edit or delete entries.
- **Insights:** Compare glucose averages by carbohydrate type, fruit, pairings, and post-meal walking. Repeated meals can also be compared with and without a walk.
- **Settings:** Set glucose targets and due date, export meal data as CSV, and sign out.
- **Reminders:** Opt in per device to a push notification one hour after a meal whose 1-hour reading is still missing.

DiaBuddy stores data in Supabase. Its database schema uses row-level security so authenticated users can access only their own records.

## Local Setup

1. Install dependencies:

	```sh
	pnpm install
	```

2. Create a `.env.local` file:

	```env
	VITE_SUPABASE_URL=https://your-project.supabase.co
	VITE_SUPABASE_ANON_KEY=your-publishable-key
	VITE_OWNER_EMAIL=you@example.com
	VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
	```

	`VITE_OWNER_EMAIL` is the only account allowed past the sign-in screen.

3. Apply the SQL migrations in [`supabase/migrations`](supabase/migrations) to your Supabase project and configure an authentication provider there.

4. Start the development server:

	```sh
	pnpm dev
	```

## Reminders Setup

Reminders are Web Push notifications sent by the `send-glucose-reminders` Edge Function, which Supabase Cron invokes every five minutes. Everything runs inside the Supabase project.

1. Generate a VAPID key pair once: `npx web-push generate-vapid-keys`.
2. Put the public key in `.env.local` (and the hosting provider's env) as `VITE_VAPID_PUBLIC_KEY`.
3. Set the function secrets:

	```sh
	supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com
	```

4. In the dashboard, under Settings → API keys → Secret keys, create a secret key named `cron`.
5. In the SQL editor, store the project URL and that key in Vault:

	```sql
	select vault.create_secret('https://your-project.supabase.co', 'project_url');
	select vault.create_secret('sb_secret_...', 'cron_secret_key');
	```

6. Deploy the functions and apply the migrations (the cron schedule is a migration):

	```sh
	supabase functions deploy
	supabase db push --linked
	```

7. Open Settings on each device and press **Enable on this device**. On iPhone, add the app to the Home Screen first. **Send test notification** confirms delivery to that device without waiting for a meal.

## Edge Functions

The two Deno functions in [`supabase/functions`](supabase/functions) are built on [`@supabase/server`](https://github.com/supabase/server) and [`@supabase/middleware`](https://github.com/supabase/middleware). Each function pins its dependencies in its own `deno.json`; `_shared/` holds the code both use.

- **`send-glucose-reminders`** is invoked by Supabase Cron every five minutes with the `cron` secret key on the `apikey` header. Its stack is `pipeline([withSupabase({ auth: 'secret:cron' }), withPostgresAdminClient()], handler)`. `withSupabase` accepts only that named key and answers anything else with 401 (`verify_jwt` is off for this function in `supabase/config.toml`, because the platform check cannot validate `sb_secret_` keys). `withPostgresAdminClient` contributes `ctx.postgresAdmin`, a direct Postgres connection; one SQL statement selects the due meals joined to their devices, and the handler sends each push, marks `reminder_sent_at`, and prunes dead subscriptions.
- **`send-test-notification`** is invoked from the browser by a signed-in user through `supabase.functions.invoke`. Its stack is `pipeline([withCors({ origin: ALLOWED_ORIGINS }), withSupabase({ auth: 'user', cors: 'disabled' }), withPushSubscription()], handler)`. `withCors` answers the preflight ahead of the auth gate. `withSupabase` verifies the session JWT and contributes `ctx.supabase`, an RLS-scoped client. `withPushSubscription` ([`_shared/with-push-subscription.ts`](supabase/functions/_shared/with-push-subscription.ts)) is a `defineMiddleware` entry that declares `supabase` as a prerequisite, reads `{ endpoint }` from the body, and either contributes `ctx.pushSubscription` or short-circuits with 400/404. The handler only sends.

`ALLOWED_ORIGINS` in `send-test-notification/index.ts` lists the origins allowed to call that function; set it to your deployment's origin.

## Data Isolation

- Every table has row-level security with owner policies (`user_id = auth.uid()`). The browser reaches Postgres with the publishable key plus the user's session JWT, so a user can read and write only their own rows.
- `send-test-notification` runs under the caller's JWT. The subscription lookup and the deletion of an expired one both go through RLS, so a user can target only their own devices.
- `send-glucose-reminders` is the one component that crosses users, because it has to see every due meal. It is reachable only with the `cron` secret key held in Vault, returns counts rather than rows, and joins each meal to the subscriptions of the same `user_id`, so a reminder about a meal reaches only that user's devices. Push payloads carry the meal slot and dish name, never glucose values, and Web Push encrypts them end to end.
- Secrets stay out of the client. The VAPID private key lives in function secrets and the `cron` key in Vault; the bundle contains only the publishable key and the VAPID public key.

## Scripts

```sh
pnpm dev        # Start the Vite development server
pnpm build      # Create a production build
pnpm typecheck  # Check TypeScript types
pnpm lint       # Run ESLint
pnpm preview    # Serve the production build locally
```

## Note

DiaBuddy is a personal logging tool, not medical advice. Use the glucose targets and care plan provided by your healthcare team.