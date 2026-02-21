# Bedwars Tournament Registration

Next.js 14 (App Router), TypeScript, Tailwind CSS, MongoDB, Mongoose.

## Setup

1. Copy `.env.example` to `.env.local` and set `MONGODB_URI`.
2. Run `npm install` then `npm run dev`.

## Project structure

```
/app
  layout.tsx       # Root layout
  page.tsx         # Public registration page (placeholder)
  admin/page.tsx   # Admin dashboard (placeholder)
  api/             # API routes (to be added)
  globals.css
/components        # Reusable UI components
/lib
  mongodb.ts       # MongoDB connection (cached)
/models
  TournamentDate.ts  # Tournament date schema
  Team.ts           # Team schema (4 players, rewardReceiver, status)
```

No registration or admin logic is implemented yet; this is the foundation only.
