# Cleaning Planner

> Know what needs cleaning today, this week, and when the next deep clean is due, with reminders on your phone.

A household cleaning planner for the people who share a home. It covers everyday jobs (vacuuming, dusting, mopping) through to the easily forgotten deep cleans (washing-machine seal and drain filter, dishwasher filter and cleaning tablet, oven, extractor filter). Each task comes with a **recommended frequency** you can adjust, and the app **reminds you** when things are due.

**Status:** planning. See [docs/PLAN.md](docs/PLAN.md) for the full proposal, research and roadmap.

## Planned features

- 📋 **Task library with recommended frequencies.** Sensible defaults and ranges, plus *how to* and *why it matters*.
- 🗓️ **Flexible schedules.** "Every 2 weeks after it was last done" or fixed days ("every Saturday", "1st of the month").
- ✅ **Today / Tomorrow / This week** views. One tap to mark done, snooze or skip.
- 🔔 **Reminders.** A daily "today's jobs" push notification and a weekly summary, at times you choose (email optional).
- 🏠 **Households.** Share with a partner or housemates, assign tasks, see who did what *(after the MVP)*.
- 📱 **Installable web app (PWA)** for iPhone, Android and desktop. App-store builds possible later.

## Planned tech stack

| Layer | Choice |
|---|---|
| App | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, installable PWA |
| Backend | Supabase (Postgres, Auth, Row Level Security, `pg_cron`, Edge Functions) |
| Notifications | Web Push (VAPID); email via Resend |
| Hosting | Vercel (preview per PR) |
| Monorepo | Turborepo + npm workspaces |
| Quality | ESLint, Prettier, TypeScript, Vitest + React Testing Library + vitest-axe, Playwright, GitHub Actions |

## Repository layout (planned)

```
apps/web            PWA front end
packages/schedule   Scheduling engine + task library (pure TypeScript, unit tested)
supabase/         Migrations, RLS policies, edge functions, seed data
docs/             Plan and architecture decisions
.claude/          Claude Code agents and settings
.github/          CI workflows
```

## Licence

Private project, all rights reserved.
