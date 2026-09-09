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

6. Deploy the function and apply the migrations (the cron schedule is a migration):

	```sh
	supabase functions deploy send-glucose-reminders
	supabase db push --linked
	```

7. Open Settings on each device and press **Enable on this device**. On iPhone, add the app to the Home Screen first. **Send test notification** confirms delivery to that device without waiting for a meal.

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