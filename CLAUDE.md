# Cleaning Planner — Claude Context

## Status

Planning stage. `docs/PLAN.md` is the agreed source of truth for scope, stack and phases. Read it before starting any work, and update it when a decision changes.

## README

`README.md` is the developer setup guide for the whole repo. If your changes affect anything it documents — stack choices, env vars, CI/CD behaviour, local setup steps, or repo structure — update `README.md` to match.

## What this is

Household cleaning planner (installable web app / PWA). Users see what needs cleaning today, this week and later, with recommended frequencies they can adjust, and get reminders (Web Push, optional email). Households with multiple members are modelled in the database from day one but exposed later.

## Repo structure (planned)

```
apps/
  web/            Next.js App Router PWA, deployed to Vercel
packages/
  schedule/       Pure TypeScript recurrence engine + task library (shared by web and reminders)
supabase/
  migrations/     SQL migrations + RLS policies
  functions/      Edge functions (notify)
docs/             PLAN.md and decision records
```

Each app/package gets its own `CLAUDE.md` with local rules when it is scaffolded.

## Stack

| Layer | Choice |
|---|---|
| Monorepo | Turborepo + npm workspaces |
| Frontend | Next.js App Router, Tailwind, shadcn/ui, PWA (manifest + service worker) |
| Backend | Supabase: Postgres + RLS, Auth (magic link), `pg_cron`, Edge Functions |
| Notifications | Web Push (VAPID) from the `notify` edge function; email via Resend |
| CI/CD | GitHub Actions, path-triggered; lint + test + e2e gate deploy to Vercel / Supabase |

## Domain rules

- **Next due dates are derived, never stored.** Compute from the task's schedule rule + its latest completion using `packages/schedule`. Never duplicate due-date logic in the web app or edge functions.
- Two schedule types: `floating` (N units after last completion) and `fixed` (weekdays / day of month). Every rule must be covered by unit tests, including DST and timezone boundaries.
- All dates are handled in the household's timezone at the edges and stored as UTC `timestamptz`.
- Every table holding household data has a `household_id` and an RLS policy restricting it to members. No table is exposed without RLS.

---

## UI/UX — non-negotiable rules

**Every UI must work on mobile (all screen sizes) and laptop. There are no exceptions.**

- Design mobile-first. Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) to layer up to larger screens.
- No layout, interaction, or content may be inaccessible or broken on any screen width.
- Touch targets must be at least 44×44px.
- Never rely on hover-only interactions — all actions must be reachable by touch.
- Calm, not naggy: no points, streak shaming or alarming colours for slightly overdue tasks.
- Test every UI change at a narrow mobile viewport and a typical laptop viewport before marking work complete.

---

## Code style — non-negotiable rules

### Types

- **Always explicit types.** Every function parameter, return type, and variable that isn't trivially inferred must be typed.
- **All exported function return types must be explicit.**
- **Never use `any`.** Never use `unknown` unless narrowing it immediately with a type guard.
- **Never use type assertions (`as SomeType`)** except at verified external boundaries (JSON parsing, DOM event targets, raw DB rows).
- Use `interface` for object shapes, `type` for unions and aliases.
- Prefer discriminated unions over optional fields when a value's presence depends on a state flag.
- Use `satisfies` to validate object literals and `as const` on enum-like objects.

### Functions and implementation

- Small and single-purpose, roughly 20 lines maximum. Extract named helpers.
- Name functions after what they return or do.
- Prefer `async/await` over promise chains.
- Simple over clever. No abstractions until a pattern appears three times.
- No defensive coding for impossible cases, no feature flags, no speculative generality.
- Validate only at system boundaries (forms, edge function inputs, external API responses).

### Comments

- No comments by default. Only explain a non-obvious **why**.

### Imports

- No barrel files except where a package boundary requires one. Import from the specific file.

### Logging

- No `console.log` in committed code. Use the shared logger once it exists.

### Test-driven development — non-negotiable rules

1. Write a failing test that specifies the expected behaviour.
2. Write the minimum code to make it pass.
3. Refactor — keep the test green.

Never write implementation code that is not covered by a test. Bug fixes start with a failing test that reproduces the bug.

### Tests

- Vitest across all packages. Tests live next to the file they test (`foo.ts` → `foo.test.ts`).
- Mock at the boundary of the unit under test; never mock internal implementation details.
- Test behaviour, not implementation.
- **Every web component test file includes an axe accessibility check** (`import { axe } from 'vitest-axe'`), as the first test in the first rendering `describe`.
- **Every new page or user flow gets a Playwright spec** in `apps/web/e2e/` covering the happy path and at least one error/edge case, passing on both the desktop and mobile projects.
- RLS policies get SQL tests proving a non-member cannot read or write another household's rows.
