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
- **Settings:** Set glucose targets and due date, export meal data as CSV or in the doctor's log format, and sign out.
- **Reminders:** Opt in per device to a push notification one hour after a meal whose 1-hour reading is still missing; send a test notification, and remove devices you no longer use.

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

	When `VITE_OWNER_EMAIL` is set, it is the only account allowed past the sign-in screen; leave it empty to admit anyone who signs in.

3. Apply the SQL migrations in [`supabase/migrations`](supabase/migrations) to your Supabase project and configure authentication there. Email/password sign-in works for accounts created in the dashboard (there is no sign-up form). For **Sign in with GitHub**, register a GitHub OAuth App with callback URL `https://<project-ref>.supabase.co/auth/v1/callback`, enable the GitHub provider under Authentication → Providers with its Client ID and secret, and under Authentication → URL Configuration set the Site URL to your deployment and add `http://localhost:5173/**` to the redirect URLs. A GitHub account whose primary email matches an existing user is linked to that user.

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
	supabase secrets set ALLOWED_ORIGINS=https://your-app.example.com,http://localhost:5173
	```

	`ALLOWED_ORIGINS` is the comma-separated list of origins allowed to call the browser-facing functions.

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

The Deno functions in [`supabase/functions`](supabase/functions) are built on [`@supabase/server`](https://github.com/supabase/server) and [`@supabase/middleware`](https://github.com/supabase/middleware). Each function pins its dependencies in its own `deno.json`; `_shared/` holds the code both use.

- **`send-glucose-reminders`** is invoked by Supabase Cron every five minutes with the `cron` secret key on the `apikey` header. Its stack is `pipeline([withSupabase({ auth: 'secret:cron' }), withPostgresAdminClient()], handler)`. `withSupabase` accepts only that named key and answers anything else with 401 (`verify_jwt` is off for this function in `supabase/config.toml`, because the platform check cannot validate `sb_secret_` keys). `withPostgresAdminClient` contributes `ctx.postgresAdmin`, a direct Postgres connection; one SQL statement selects the due meals joined to their devices, and the handler sends each push, marks `reminder_sent_at`, and prunes dead subscriptions.
- **`send-test-notification`** and **`remove-device`** are invoked from the browser by a signed-in user through `supabase.functions.invoke`, each with `{ endpoint }` in the body. Both are `pipeline([withDeviceRequest()], handler)`, where `withDeviceRequest` ([`_shared/with-device-request.ts`](supabase/functions/_shared/with-device-request.ts)) is a `defineComposite` bundling `withCors({ origin: ALLOWED_ORIGINS })`, `withSupabase({ auth: 'user', cors: 'disabled' })`, and `withPushSubscription()`, with `cors` marked `internal` since no handler reads it. `withCors` answers the preflight ahead of the auth gate. `withSupabase` verifies the session JWT and contributes `ctx.supabase`, an RLS-scoped client. `withPushSubscription` ([`_shared/with-push-subscription.ts`](supabase/functions/_shared/with-push-subscription.ts)) is a `defineMiddleware` entry that declares `supabase` as a prerequisite and either contributes `ctx.pushSubscription` — the caller's own row for that endpoint — or short-circuits with 400/404. The handlers only send a push, or delete the row.

- **`doctor-report`** builds the doctor-format CSV on the server for users the `doctor-report` feature flag admits. Its stack is `pipeline([withCors(...), withSupabase({ auth: 'user', cors: 'disabled' }), withFeatureFlag({ name: 'doctor-report', evaluate }), withPostgresClient()], handler)`. `withFeatureFlag` reads the caller's row in `feature_flags` (with a client scoped by the request's own token, since `evaluate` sees only the request) and answers `404 feature_disabled` otherwise. `withPostgresClient` contributes `ctx.postgres`, a direct Postgres connection that runs as the caller with RLS enforced; one SQL statement in [`_shared/doctor-report.ts`](supabase/functions/_shared/doctor-report.ts) produces the per-day rows, computing days in the user's timezone and weights per 7-day block. The Settings screen tries this function first and falls back to the local CSV when the flag is off.
- **`mcp`** is the MCP server described below. Its stack is `pipeline([withOAuthProtectedResource(), withSupabase({ auth: 'user' }), withPostgresClient()], handler)`. `withOAuthProtectedResource` runs first because the OAuth discovery request carries no token: it serves the protected-resource metadata at `/functions/v1/mcp/oauth-protected-resource` and adds the `WWW-Authenticate` challenge to 401s (`verify_jwt` is off for this function for the same reason). The handler builds one `McpServer` per request from `generateTools(ctx.supabase)` in `@supabase/server/mcp` (list, get, create and update tools for every table the caller can reach, described from the schema's `COMMENT ON` text, minus `delete_*` and the `push_subscriptions` and `feature_flags` tables) plus five hand-written read-only tools in [`mcp/tools.ts`](supabase/functions/mcp/tools.ts): `list_meals`, `get_meal`, `list_daily_metrics`, `glucose_summary`, and `doctor_report`, which shares its SQL with the `doctor-report` function. Every tool runs as the caller through `ctx.supabase` or `ctx.postgres`, so RLS applies exactly as in the app. This function pins `@supabase/server@1.7.0-beta.0` for the generator; the others stay on 1.6.0.

The origins allowed to call those functions come from the `ALLOWED_ORIGINS` function secret (see Reminders Setup); without it only `http://localhost:5173` is allowed.

## MCP Server

`supabase/functions/mcp` exposes DiaBuddy to MCP clients such as Claude Code. Authentication is Supabase Auth's OAuth 2.1 server: the client discovers it from the function's protected-resource metadata, registers itself, and sends the user to `/oauth/consent` in this app to approve access. Every tool then runs as that user under the same row-level security as the app.

Setup:

1. In the dashboard, under Authentication → OAuth Server, enable the OAuth 2.1 server, set the authorization path to `/oauth/consent`, and enable dynamic client registration.
2. Under Authentication → URL Configuration, add `https://<your-app>/**` to the redirect URLs so the consent page survives a sign-in round trip with its query string intact.
3. Deploy the function and apply the migrations (the schema comments that describe the generated tools are a migration):

	```sh
	supabase functions deploy mcp
	supabase db push --linked
	```

4. Add the server to a client:

	```sh
	claude mcp add diabuddy -t http https://<project-ref>.supabase.co/functions/v1/mcp
	```

	On first use the client opens `/oauth/consent`; sign in and press **Approve**. Claude Desktop and Cursor take the same URL as a custom connector.

## Feature Flags

`public.feature_flags` holds one row per `(flag, user_id)`; a user without a row is not admitted. Rows are managed from the SQL editor and are readable only by their owner:

```sql
insert into public.feature_flags (flag, user_id) values ('doctor-report', '<user uuid>');
```

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