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
	```

3. Apply the SQL migrations in [`supabase/migrations`](supabase/migrations) to your Supabase project and configure an authentication provider there.

4. Start the development server:

	```sh
	pnpm dev
	```

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