# cronflow — Project Memory

## Stack
- Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- Prisma 6 + PostgreSQL (`@prisma/client@^6`)
- node-cron v4 (CJS), @iarna/toml (CJS), p-limit v7 (ESM — dynamic imported in scheduler)
- axios for webhook HTTP calls

## Key Decisions
- Prisma 7 was INCOMPATIBLE (requires driver adapters, no URL in schema). Downgraded to Prisma 6.
- p-limit v7 is ESM-only → use dynamic `import('p-limit')` in `lib/scheduler.ts`
- All API routes have `export const dynamic = 'force-dynamic'` to prevent build-time execution
- Scheduler starts in `app/layout.tsx` via `startScheduler()` (singleton pattern via `schedulerRunning` flag)
- `prisma.config.ts` not needed (Prisma 7 concept only)

## File Structure
- `lib/parser.ts` — loads jobs.toml from process.cwd()
- `lib/cron-renderer.ts` — converts human-readable schedules to cron expressions
- `lib/executor.ts` — runs jobs, handles retries, updates DB records
- `lib/scheduler.ts` — node-cron scheduler, singleton, p-limit concurrency
- `lib/prisma.ts` — global Prisma singleton for Next.js
- `prisma/schema.prisma` — JobRun + JobState models
- `jobs.toml` — job definitions in project root
- `components/Sidebar.tsx`, `StatusBadge.tsx`, `JobCard.tsx`
- `app/page.tsx` — Dashboard with stats + job grid (10s polling)
- `app/jobs/page.tsx` — Jobs table
- `app/jobs/[name]/page.tsx` — Job detail + run history

## Design System
- Background: #16131f, Surface: #1e1a2e
- Primary purple: #7c5cbf, Light purple: #c4b5f4
- Text: #e8e0ff, Muted: #8b7db5
- Success: #4ade80, Failure: #f87171, Running: #fbbf24

## Build
- `npm run build` → passes cleanly
- `npm run dev` → development server
- `npm run db:push` → `prisma db push --accept-data-loss`
