# Convex Setup Instructions

This project uses Convex for real-time favorites sync. To set up Convex:

## 1. Install Convex CLI (if not already installed)

```bash
npm install -g convex
```

## 2. Initialize Convex

Run this command in the project root:

```bash
npx convex dev
```

This will:
- Create a Convex account (if you don't have one)
- Create a new Convex project
- Generate the `convex/_generated` files
- Set up the `NEXT_PUBLIC_CONVEX_URL` environment variable

## 3. Environment Variables

After running `npx convex dev`, you'll get a `NEXT_PUBLIC_CONVEX_URL` that should be added to your `.env.local` file:

```
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

## 4. Deploy Convex Functions

The Convex functions are already defined in:
- `convex/schema.ts` - Database schema
- `convex/favorites.ts` - Queries and mutations

When you run `npx convex dev`, these will be automatically deployed.

## 5. Verify Setup

1. Start your Next.js dev server: `npm run dev`
2. Open the app and click the sync icon (cloud icon) in the header
3. Generate a new sync ID and connect
4. Your favorites should now sync in real-time!

## Troubleshooting

- If you see "NEXT_PUBLIC_CONVEX_URL not set" warnings, make sure you've added the environment variable to `.env.local`
- If sync doesn't work, check the browser console for errors
- Make sure `npx convex dev` is running in a separate terminal while developing

## Production Deployment

For production, you'll need to:
1. Deploy your Convex functions: `npx convex deploy`
2. Set the `NEXT_PUBLIC_CONVEX_URL` environment variable in your hosting platform (Vercel, etc.)

