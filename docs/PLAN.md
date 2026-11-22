# Cleaning Planner: Plan

Status: **Phase 0 in progress** (2026-11-22). Stack approved as recommended below; monorepo, CI and Claude setup scaffolded.

---

## 1. The problem

We want one place that answers three questions without anyone having to remember:

1. **What needs cleaning today / tomorrow?**
2. **What needs cleaning this week?**
3. **When is the next deep clean of X due?** (washing machine seal, dishwasher filter, oven, extractor filter…)

…and that **reminds us** at the right moment, with frequencies we control but sensible **recommendations** as a starting point.

### MVP (must have)

- A library of cleaning tasks with **recommended frequencies** (daily vacuum → quarterly washing-machine drain filter).
- Each task's schedule is **user-configurable**: every N days/weeks/months, or specific weekdays / day-of-month.
- **Today / Tomorrow / This week / Later** views. Mark a task done in one tap; snooze or skip.
- **Reminders**: a daily "today's jobs" notification and a weekly "this week" summary, each with a time we choose.
- Works on both our phones (iOS + Android) and on desktop.

### Secondary (designed for now, built later)

- **Household**: more than one person, assign tasks, see who did what, rotate chores.
- More channels (email, calendar feed, group chat), stats/history, app-store builds.

### Non-goals for now

- Gamification/points/leaderboards (reviews of Sweepy show points get gamed and cause friction, see §3).
- Multi-household SaaS, payments, public sign-up.

---

## 2. Recommendation in one paragraph

Build an **installable web app (PWA)** with **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui** on **Vercel**, backed by a **serverless AWS API** (Express on Lambda behind API Gateway, DynamoDB, Cognito, EventBridge Scheduler, SES) defined in **CloudFormation/SAM** with a **self-updating CodePipeline**, in a **Turborepo + npm workspaces monorepo**. GitHub Actions runs the PR checks (lint, typecheck, unit tests, e2e, template lint). This mirrors **Ride Logger** (web app, rules) and **playlist-transfer-backend** (IaC + pipeline). Expected AWS cost is **about $0–1/month** (§7). Reminders start as **Web Push** (free; works on Android and on iPhone once the app is added to the Home Screen) plus an optional **email digest** via SES. Model **households from day one** in the database (it costs almost nothing) but only expose a single household in the UI. If we later want real App Store / Google Play apps, wrap the same web app with **Capacitor** and switch to native push. No rewrite needed.

---

## 3. What's already out there (research)

### Consumer apps

| App                                                          | Model                                                                                                                                     | What's good                                                           | Common complaints                                                                                                                                                                                                                      |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tody**                                                     | _Need-based_: each task has a "dirtiness" bar that fills up since it was last done, rather than a fixed due date. Notifications optional. | Low guilt, no hard deadlines; colour-coded urgency; one-off purchase. | No way to flag a chore as urgent; users want to see _who_ did which task.                                                                                                                                                              |
| **Sweepy**                                                   | _Room-based_: preset tasks per room, room cleanliness indicator, points & family leaderboard, auto-generated daily schedule.              | Very fast setup from presets; motivating; household sharing.          | Setup feels overwhelming; can't delete irrelevant rooms easily; want to choose week start; want to assign tasks per person; points can be gamed; subscription ($3.99/mo or $19.99/yr); privacy concerns flagged by Common Sense Media. |
| Quiet Clean, Qleany, PikaPika, Tidily, Housy (2026 listings) | Recurring checklists with templates; daily/weekly/monthly                                                                                 | Simple; some keep data on-device                                      | Mostly fixed calendars; little guidance on _how often_.                                                                                                                                                                                |

### Open source / self-hosted

- **Donetick** (Go, open source). Focused on chores/tasks with a modern UI. Good reference for recurrence options and assignee rotation.
- **Grocy**. Much broader (groceries, pantry, recipes) with chores and household splitting. Overkill for us, but its chore scheduling types (daily, weekly, monthly, "dynamic regular" = N days after last done) are a useful model.

### Takeaways that shape our design

1. **Two scheduling styles are both needed**:
   - _Floating_ ("every 14 days **after it was last done**"): Tody/Grocy-style, right for most cleaning.
   - _Fixed_ ("every Saturday", "1st of the month"): right for bins, routines, and things we want on a set day.
2. **Recommendations are the gap.** Almost no app explains _why_ a frequency is suggested or _how_ to do the job. That's our differentiator: each library task ships with a recommended frequency, a sensible range, a short "how to" and a "why it matters".
3. **Onboarding from what you own**: pick the rooms and appliances you actually have (washing machine, dishwasher, tumble dryer, oven, extractor, carpets vs hard floors, pets…) and generate the schedule. Make removing things effortless.
4. **Spread the load.** Avoid 9 monthly tasks all landing on the same Saturday. Stagger first-due dates when generating.
5. **Show who did it and when** (history), without points.
6. **Configurable week start, quiet hours, reminder times.**

---

## 4. Recommended-frequency library (seed data)

These are starting defaults with a user-adjustable range. They come from manufacturer/expert guidance where available (see Sources). **The owner's manual always wins**, and the app should say so.

| Area     | Task                                         | Default        | Typical range      | Notes                                                                   |
| -------- | -------------------------------------------- | -------------- | ------------------ | ----------------------------------------------------------------------- |
| Laundry  | Maintenance wash / drum-cleaning tablet      | Monthly        | 2–6 weeks          | Hot empty cycle or cleaner tablet                                       |
| Laundry  | Wipe door rubber seal & dry                  | Weekly         | Weekly–fortnightly | Prevents mould and smells; leave door ajar                              |
| Laundry  | Clean detergent drawer                       | Monthly        | 2–6 weeks          |                                                                         |
| Laundry  | Drain pump filter                            | Every 3 months | 1–3 months         | Monthly if pockets often aren't emptied; some newer models have none    |
| Laundry  | Tumble dryer lint filter                     | Every use      | —                  | Better as a habit tip than a reminder                                   |
| Kitchen  | Dishwasher filter                            | Every 2 weeks  | 2 weeks–3 months   | Heavy use → fortnightly; light use / scraped plates → monthly–quarterly |
| Kitchen  | Dishwasher cleaning tablet / hot empty cycle | Monthly        | 1–2 months         |                                                                         |
| Kitchen  | Dishwasher spray arms & door seal            | Every 3 months | 1–3 months         |                                                                         |
| Kitchen  | Fridge: bin out-of-date food & wipe shelves  | Weekly         | Weekly             |                                                                         |
| Kitchen  | Fridge deep clean                            | Every 3 months | 1–4 months         |                                                                         |
| Kitchen  | Oven deep clean                              | Every 3 months | 3–6 months         |                                                                         |
| Kitchen  | Extractor hood filter                        | Monthly        | 1–3 months         |                                                                         |
| Kitchen  | Descale kettle                               | Monthly        | 1–3 months         | Hard-water areas more often                                             |
| Kitchen  | Microwave                                    | Weekly         | Weekly–fortnightly |                                                                         |
| Floors   | Vacuum main areas                            | Twice a week   | 1–7 per week       | Pets → more often                                                       |
| Floors   | Mop hard floors                              | Weekly         | Weekly–fortnightly |                                                                         |
| General  | Dust surfaces                                | Weekly         | Weekly–fortnightly |                                                                         |
| Bedroom  | Change bed sheets                            | Weekly         | 1–2 weeks          |                                                                         |
| Bedroom  | Wash pillows & duvet                         | Every 6 months | 3–6 months         |                                                                         |
| Bedroom  | Rotate / vacuum mattress                     | Every 3 months | 3–6 months         |                                                                         |
| Bathroom | Clean toilet, sink, shower                   | Weekly         | Weekly             |                                                                         |
| Bathroom | Descale shower head                          | Every 3 months | 1–3 months         |                                                                         |
| Bathroom | Wash bath mats & shower curtain              | Monthly        | 2–6 weeks          |                                                                         |
| Home     | Wipe light switches & door handles           | Weekly         | Weekly–monthly     |                                                                         |
| Home     | Clean windows (inside)                       | Monthly        | 1–3 months         |                                                                         |
| Home     | Skirting boards                              | Monthly        | 1–3 months         |                                                                         |
| Home     | Test smoke / CO alarms                       | Monthly        | Monthly            | Safety; worth including                                                 |

Each entry in code: `id, name, area, defaultInterval, minInterval, maxInterval, scheduleType (floating|fixed), effortMinutes, howTo, why, sources[]`. Users can add their own tasks too.

---

## 5. Notifications: options and how each works

| Channel                    | How it works                                                                                                                                                                                                | Cost                                               | iOS                                                                                                                                                                      | Android                                  | Effort     | Verdict                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| **Web Push (PWA)**         | Browser gives us a push subscription (endpoint + keys). Our server signs a message with our VAPID key and sends it to Apple/Google's push service, which wakes our service worker to show the notification. | Free                                               | iOS/iPadOS 16.4+ **only after "Add to Home Screen"**; permission must be requested from a user tap. No automatic install prompt, so the app shows an "Install me" guide. | Yes (Chrome), can also prompt to install | Medium     | **MVP primary**                                                                                             |
| **Email digest**           | Scheduled job renders "Today" / "This week" email and sends via Amazon SES (sandbox is enough when both addresses are verified).                                                                            | ≈ $0.10 per 1,000 (check 2026 SES plan fees)       | Yes                                                                                                                                                                      | Yes                                      | Low        | **MVP secondary** (weekly summary)                                                                          |
| **Calendar feed (ICS)**    | Private URL serving an `.ics` file; subscribe in Apple/Google Calendar; calendar's own alerts remind you.                                                                                                   | Free                                               | Yes                                                                                                                                                                      | Yes                                      | Low        | Phase 4; great "zero-install" option. Calendars refresh slowly (hours), so it's not great for "done" status |
| **Telegram bot**           | Bot posts daily list to a private group with both of us; inline "✅ Done" buttons call our API.                                                                                                             | Free                                               | Yes                                                                                                                                                                      | Yes                                      | Low–medium | Phase 4; nice for a shared household chat                                                                   |
| **ntfy**                   | HTTP POST to a topic; the ntfy app on your phone receives it. Public server free, or self-host.                                                                                                             | Free                                               | Yes (via ntfy.sh relay)                                                                                                                                                  | Yes                                      | Very low   | Useful as a quick prototype or fallback, but it's a separate app and topics need access control             |
| **Native push (APNs/FCM)** | Only once the app is a store app (Capacitor/Expo).                                                                                                                                                          | Apple dev £/$99/yr; Google $25 once                | Yes                                                                                                                                                                      | Yes                                      | Medium     | Only if we go to the stores                                                                                 |
| **SMS / WhatsApp**         | Twilio etc.                                                                                                                                                                                                 | Paid per message; WhatsApp needs business approval | Yes                                                                                                                                                                      | Yes                                      | Medium     | Not worth it                                                                                                |

### The scheduler (who decides _when_ to notify)

Notifications need something running on a clock even when nobody has the app open:

- **Recommended: EventBridge Scheduler** (14M invocations/month free) triggers a **`notify` Lambda** every 15 minutes. The function finds users whose chosen reminder time (in _their_ timezone) has just passed, builds their list from the same scheduling engine the app uses, and sends push (directly to Apple/Google with our VAPID key) and email (SES). It also respects quiet hours, skips empty days, and de-duplicates.
- The Lambda must **not** run inside a VPC: it needs the internet to reach the push services, and a NAT Gateway would cost ~$33+/month.
- **Avoid GitHub Actions cron for reminders.** Runs are not guaranteed on time (reports of 5–30 min delays, sometimes hours or skipped runs), and scheduled workflows get disabled after inactivity.

---

## 6. Architecture

```
┌──────────────────────────┐  HTTPS + JWT   ┌──────────────────────── AWS (one CloudFormation stack) ───┐
│ apps/web (PWA, Vercel)   │───────────────►│ API Gateway (HTTP API) ─► Lambda "api" (Express)          │
│ Next.js + TS + Tailwind  │                │                              │                            │
│ Service worker (push)    │◄── sign-in ───►│ Cognito user pool            ▼                            │
└──────────────────────────┘                │                          DynamoDB (single table)          │
        ▲  Web Push (VAPID)                 │ EventBridge Scheduler ─► Lambda "notify" ──► SES (email)  │
        └──────── Apple / Google push ◄─────│                              │                            │
                                            │ CodePipeline ─► CodeBuild ─► CloudFormation change set    │
                                            └───────────────────────────────────────────────────────────┘
```

Both Lambdas import `packages/schedule`, so the app and the reminders agree on what is due.

### Monorepo layout

```
cleaning-planner/
├─ apps/
│  ├─ web/                 Next.js PWA + its own CLAUDE.md (later: Capacitor wraps this for iOS/Android)
│  └─ api/                 Express on Lambda (controllers → service → data), esbuild bundle + CLAUDE.md
├─ packages/
│  └─ schedule/            Pure TS: recurrence engine, due-date maths, task library, load spreading + CLAUDE.md
├─ infrastructure/
│  ├─ template.yml         SAM/CloudFormation: API, DynamoDB, budget, pipeline (self-updating)
│  └─ buildspec.yml        CodeBuild: install → lint/typecheck/test → bundle → cloudformation package
├─ docs/                   PLAN.md, ADRs
├─ CLAUDE.md               Root Claude context and non-negotiable rules (Ride Logger style)
├─ .claude/settings.json   Shared Claude Code settings; .mcp.json for the GitHub MCP server
├─ .github/workflows/      Path-triggered CI per app/package
└─ package.json (npm workspaces), turbo.json
```

Putting the scheduling logic in `packages/schedule` means the app's "due today" list and the reminder function's list are **the same code**, tested once.

### Data model (sketch)

- `households(id, name, week_starts_on, timezone)`
- `members(household_id, user_id, display_name, role)`
- `areas(id, household_id, name, icon)` (rooms/appliances)
- `tasks(id, household_id, area_id, library_id?, name, schedule_type, interval_value, interval_unit, weekdays[], month_day?, assignee_id?, rotation?, notes, active)`
- `completions(id, task_id, done_by, done_at, skipped bool, note)`
- `notification_prefs(user_id, daily_time, weekly_day, weekly_time, quiet_hours, channels)`
- `push_subscriptions(user_id, endpoint, p256dh, auth, device_label)`

Next due is **derived** (from last completion + rule), not stored, so editing a frequency instantly reschedules.

In DynamoDB these live in **one table** keyed by household, e.g. `pk = HOUSEHOLD#<id>` with `sk = TASK#<id>`, `COMPLETION#<taskId>#<date>`, `MEMBER#<userId>`, so "everything for my household" is a single query. A `USER#<id>` item maps a signed-in user to their household(s). Access patterns are designed in Phase 1 before any data code is written.

### Tech choices and why

| Concern    | Choice                                                                                                                                                                                | Why / alternative                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI         | Next.js (App Router) + TypeScript, web manifest + service worker (Serwist)                                                                                                            | Same as Ride Logger, so it's familiar, and Vercel-native. _Alt:_ Vite SPA (lighter); Expo/React Native for web (better if native apps were the priority, weaker web push story). |
| Styling    | Tailwind + shadcn/ui                                                                                                                                                                  | Same as Ride Logger; accessible, mobile-first.                                                                                                                                   |
| API        | Express 5 on Lambda via `@codegenie/serverless-express`, behind API Gateway **HTTP API**; esbuild bundle                                                                              | Same Express + controllers/service/data layering as Ride Logger and playlist-transfer-backend. HTTP API is ~70% cheaper than the REST API type.                                  |
| Data       | DynamoDB on-demand, single table, point-in-time recovery; TanStack Query in the web app                                                                                               | ~$0 at our scale, no connection pooling, no VPC. _Alt:_ Aurora DSQL (Postgres-compatible, also ~$0, no foreign keys).                                                            |
| Auth       | Cognito user pool (Essentials, email one-time codes), JWT authorizer on API Gateway                                                                                                   | Free under 10,000 monthly users. **Differs from Ride Logger** (hand-rolled JWT), less to secure ourselves.                                                                       |
| IaC/deploy | SAM/CloudFormation template + CodePipeline V2 (GitHub via CodeConnections) + CodeBuild                                                                                                | Same self-updating pattern as playlist-transfer-backend; pipeline only triggers on API/infra paths.                                                                              |
| Dates      | `date-fns` + `@date-fns/tz`                                                                                                                                                           | Timezones/DST matter for reminder times.                                                                                                                                         |
| Tests      | Vitest + React Testing Library + `vitest-axe` (every component), Playwright on desktop Chrome **and** mobile (Pixel 7 + iPhone), supertest for the API, DynamoDB Local for data tests | Same rules as Ride Logger: TDD, tests next to source, e2e for every flow.                                                                                                        |
| Monorepo   | Turborepo + npm workspaces                                                                                                                                                            | Same as Ride Logger.                                                                                                                                                             |

---

## 7. Hosting / deployment options

| Option               | Fit                  | Pros                                                                                       | Cons                                                                                  |
| -------------------- | -------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| **Vercel (Hobby)**   | ⭐ Recommended       | Zero-config Vite deploys, **preview URL per PR**, easy env vars, cron available if needed. | Hobby plan is for non-commercial use only (fine for us).                              |
| **Cloudflare Pages** | ⭐ Equal alternative | Unmetered static bandwidth, previews per PR, Workers cron.                                 | Slightly more config.                                                                 |
| **Netlify**          | OK                   | Previews, simple.                                                                          | Moved to credit-based billing (Sept 2025); tighter build limits.                      |
| **GitHub Pages**     | Not for this repo    | Free, simple.                                                                              | **Pages on a private repo requires a paid GitHub plan**; no PR previews; static only. |

The web app stays on Vercel; the backend is AWS in `ap-southeast-2` (Sydney, same as Ride Logger).

### AWS cost estimate (2–6 people)

| Piece           | Service                                                   | Free allowance              | Expected cost |
| --------------- | --------------------------------------------------------- | --------------------------- | ------------- |
| API compute     | Lambda (arm64)                                            | 1M requests/month, always   | $0            |
| API endpoint    | API Gateway HTTP API                                      | —                           | ~$0.05        |
| Database        | DynamoDB on-demand + PITR                                 | 25 GB storage, always       | ~$0.01–0.10   |
| Sign-in         | Cognito                                                   | 10,000 monthly active users | $0            |
| Reminder timer  | EventBridge Scheduler                                     | 14M invocations/month       | $0            |
| Email           | SES                                                       | —                           | < $0.05       |
| Pipeline        | CodePipeline V2 (~6 action-minutes per deploy)            | 100 action-minutes/month    | $0            |
| Build           | CodeBuild general1.small                                  | 100 build minutes/month     | $0            |
| Logs, artifacts | CloudWatch Logs (30-day retention), S3 (30-day lifecycle) | 5 GB logs                   | ~$0           |
| **Total**       |                                                           |                             | **≈ $0–1**    |

What would make it expensive, and is deliberately avoided: RDS (~$20–25/month always-on) and anything inside a VPC needing a NAT Gateway (~$33+/month). The stack includes an **AWS Budget** that emails at 80% of $5 (actual) and 100% (forecast). It is account-wide, so set `MonthlyBudgetUsd` above any other AWS spend in the account.

**Environments:** `production` branch → production; `development` is the integration branch. Every PR → Vercel preview; a separate `staging` stack can be added later by deploying the same template under another stack name.

### App stores, later (optional)

- **Capacitor** wraps `apps/web` into iOS and Android projects, adds native push (APNs/FCM) and a proper icon/splash. Costs: Apple Developer Program $99/yr, Google Play $25 one-off; review processes.
- Until then, "Add to Home Screen" gives a full-screen app icon on both platforms, with push.

---

## 8. CI/CD

### Branch flow (decided 2026-11-22)

```
feature/fix/chore branch ──PR──► development ──release PR──► production ──► automatic deploy
   local: format, lint,         "PR checks passed"   "Release checks passed"    Vercel + CodePipeline
   typecheck, test              (fast, required)     (heavy, required,
                                                      source must be development)
```

- `development` is the default branch; `production` (renamed from `main`) is what's deployed.
- **GitHub rulesets** on both branches, with no bypass actors (admins included): no direct pushes (PR required), required status check, no force-push, no deletion. `development` allows squash merges only; `production` allows merge commits only, so its history keeps every release as one merge.
- "Only development can merge into production" is enforced by the `Source branch is development` job, which is part of the required "Release checks passed" check.
- Required checks come from single aggregator jobs and the workflows have no path filters, so a required check can never sit "pending" because a workflow was skipped.

Two halves:

- **GitHub Actions** for checks on every PR plus the Vercel deploy for the web app.
- **AWS CodePipeline** for the backend (modelled on playlist-transfer-backend): defined in the same CloudFormation template it deploys, watching the `production` branch, so infrastructure changes ship the same way as code.

### Backend pipeline (`infrastructure/template.yml`)

```
merge into production touching apps/api/**, packages/schedule/**, infrastructure/** or lockfiles
  → Source:  GitHub via CodeConnections (V2 trigger with file-path filters)
  → Build:   CodeBuild runs infrastructure/buildspec.yml
             npm ci (api + schedule only) → lint, typecheck, tests → esbuild bundle
             → aws cloudformation package (uploads the bundle to the artifact bucket)
  → Deploy:  CloudFormation CHANGE_SET_REPLACE → CHANGE_SET_EXECUTE, using a dedicated deploy role
```

Improvements over playlist-transfer-backend:

- **CodeConnections** (GitHub App) instead of the GitHub v1 OAuth-token source, which AWS no longer recommends.
- **Pipeline V2 with path filters**, so web-only changes don't redeploy the backend (and V2 is cheaper: billed per action-minute with 100 free).
- **Scoped IAM** instead of `*FullAccess` managed policies: the build role can only write logs and artifacts; the deploy role can only manage IAM roles named after this stack.
- **HTTP API** instead of REST API, arm64 Lambdas, 30-day log retention and artifact expiry, and a cost budget.
- **No database migrations stage**: DynamoDB has no schema; the table is defined in the template.

First deploy is a one-off `sam deploy` from a laptop (see README). After that, every merge into `production` that touches the backend deploys itself.

### GitHub Actions

- **`pr-checks.yml`** (PRs into `development`, ~1–2 min): Prettier check, ESLint, `tsc --noEmit`, unit tests with coverage gates (95% schedule, 90% API) and `cfn-lint`, rolled up into **PR checks passed**.
- **`release-checks.yml`** (PRs into `production`, also runnable manually; ~5–8 min): source-branch check, everything above, production builds plus a smoke test that invokes the Lambda bundle with an API Gateway event, Playwright e2e on desktop/Android/iPhone (report uploaded), `npm audit --omit=dev --audit-level=high`, and free quality gates: **Knip** (unused files/exports/deps), **jscpd** (duplication ≤ 3%), **Stryker** mutation testing of `packages/schedule` (break < 85%), **Lighthouse CI** (accessibility/best practices ≥ 0.95, SEO ≥ 0.9, performance warn < 0.85), **Semgrep CE** SAST, **Gitleaks** secret scan of full history and **actionlint**. All roll up into **Release checks passed**. Dependabot alerts and automated security fixes are on. The repo is public (recreated 2026-11-22 from a clean history), which makes **CodeQL** (default setup, extended queries; required by both rulesets) and **secret scanning with push protection** free.
- **`deploy.yml`** (push to `production`): Vercel deploy with `npx vercel --prod` using `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` (same as Ride Logger). PR previews come from the Vercel GitHub integration. The backend is deployed by CodePipeline, not Actions.
- **Hygiene**: Node **24** (current LTS) pinned in `.nvmrc` and read by CI via `node-version-file`. (Ride Logger pins 18 locally and 20 in CI; both are now end-of-life, Node 20 since April 2026.) Dependabot for npm and Actions.
- **The Vercel deploy job skips with a notice until its secrets are set**, so CI is green before hosting is connected.

### Claude Code setup (from Ride Logger)

- Root **`CLAUDE.md`**: what the app is, repo structure, stack, and the non-negotiable rules carried over from Ride Logger (explicit types/no `any`, small functions, TDD, tests next to source, mobile-first with 44px touch targets, axe check in every component test, keep README in sync).
- A **`CLAUDE.md` per app/package** (`apps/web`, `apps/api`, `packages/schedule`) with local rules, added as each is scaffolded.
- **`.claude/settings.json`** enabling the GitHub MCP server from **`.mcp.json`**; `.claude/settings.local.json` git-ignored for personal overrides.

---

## 9. UX sketch

**Home = "Today"**

- Greeting + count ("4 jobs today, ~35 min").
- Sections: **Overdue** (soft red), **Today**, **Tomorrow**. Each row: task, area icon, effort, assignee avatar; **tap ✓ to complete**, swipe to snooze (1 day / until weekend) or skip.
- Floating tasks show a Tody-style **freshness bar** instead of a harsh deadline.

**This week**: day-by-day agenda with load per day; drag a task to another day.

**Home map**: grid of rooms/appliances, each with a health ring (share of tasks up to date). Tap → that area's tasks.

**Task detail**: frequency picker with the **recommended value highlighted** and the range shaded ("Recommended: monthly. Most people do every 2–6 weeks"), _How to_ and _Why_, history (who/when).

**Onboarding (≈1 minute)**: 1) Which rooms do you have? 2) Which appliances? 3) Floors: carpet / hard / both; pets? 4) Who lives here? 5) When do you want reminders? → generates a staggered schedule you can tweak.

**Settings**: reminder times, weekly summary day, quiet hours, week start, channels, install guide for iPhone.

Design principles: calm not naggy; one-tap actions; works one-handed; dark mode; accessible contrast; no points.

---

## 10. Phased delivery

| Phase                | Scope                                                                                                                                                                                              | Done when                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **0. Foundations**   | Repo, monorepo scaffold, `.claude/` personas, CI green, CloudFormation stack + pipeline bootstrapped, API health endpoint live, empty PWA on Vercel                                                | A PR shows checks; `/v1/health` answers from AWS; web has a URL |
| **1. Core MVP**      | `packages/schedule` recurrence engine (heavily unit-tested), task library seed, Cognito auth, DynamoDB access patterns, single household, Today/Week/Areas views, complete/snooze/skip, onboarding | We use it daily on both phones from the Home Screen             |
| **2. Reminders**     | Push subscription flow + iOS install guide, `notify` Lambda on EventBridge Scheduler, daily + weekly reminders, notification settings, optional SES email digest                                   | Reminders arrive at the chosen time on both phones              |
| **3. Household**     | Invite partner/others, assignees, rotation, history ("done by"), per-person reminders                                                                                                              | Each person gets only their jobs (or all, by preference)        |
| **4. Nice-to-haves** | ICS calendar feed, Telegram bot, stats, load balancing suggestions, offline mode, Capacitor store builds                                                                                           | As wanted                                                       |

---

## 11. Open decisions (for us)

1. **Name** of the app/repo (working title: _Cleaning Planner_).
2. ~~Backend~~: **decided** (2026-11-22): AWS instead of Supabase, IaC + pipeline like playlist-transfer-backend.
3. **Database**: DynamoDB (chosen by default as recommended) or Aurora DSQL if SQL is preferred. Only the table resource and data layer differ; nothing is built on it yet.
4. **Email digest in MVP**, or push only?
5. Are we in the **EU/UK**? (Affects nothing technical today. Apple kept Home Screen web apps in the EU after briefly removing them in 2024, but worth re-checking before relying on iOS push.)

---

## Sources

- Tody: [App Store](https://apps.apple.com/us/app/-/id595339588), [Apartment Therapy review](https://www.apartmenttherapy.com/tody-cleaning-app-review-37282867)
- Sweepy: [App Store](https://apps.apple.com/gb/app/id1498897320?l=en-gb), [Apartment Therapy review](https://www.apartmenttherapy.com/sweepy-cleaning-app-review-37027260), [Common Sense Media](https://www.commonsensemedia.org/app-reviews/sweepy-home-cleaning-schedule), [user reviews](https://justuseapp.com/en/app/1498897320/sweepy-home-cleaning-schedule/reviews)
- Roundups: [Care.com](https://www.care.com/c/house-cleaning-app/), [Quicken 2026](https://www.quicken.com/blog/best-apps-for-managing-recurring-household-tasks-and-life-administration-2026/)
- Open source: [Donetick](https://github.com/donetick), [Grocy chores docs](https://github.com/grocy/docs/blob/master/tutorials/chores.md)
- Frequencies: [Homes & Gardens: dishwasher](https://www.homesandgardens.com/solved/how-often-should-you-clean-a-dishwasher), [Apartment Therapy: dishwasher filter](https://www.apartmenttherapy.com/how-to-clean-dishwasher-filter-37119263), [SlashGear: dishwasher filter](https://www.slashgear.com/2264105/how-to-clean-dishwasher-filter-how-often-you-should/), [AOL: washing machine filter](https://www.aol.com/articles/often-cleaning-washing-machine-filter-190000603.html), [Bob Vila](https://www.bobvila.com/interior/dishwasher-filter-maintenance/)
- Web push on iOS: [MagicBell guide](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide), [Pushpad: iOS requirements](https://pushpad.xyz/blog/ios-special-requirements-for-web-push-notifications), [Apple forums](https://developer.apple.com/forums/thread/732594), [MacRumors: EU web apps reversal](https://www.macrumors.com/2024/03/01/apple-walks-back-decision-to-disable-eu-web-apps/), [heise: iOS 26 web app behaviour](https://heise.de/-10749652)
- Stack: [Expo: choosing a mobile stack](https://expo.dev/articles/choosing-a-mobile-stack), [ntfy](https://github.com/binwiederhier/ntfy), [Lambda Node.js 24 runtime](https://aws.amazon.com/about-aws/whats-new/2025/11/aws-lambda-nodejs-24)
- AWS pricing: [Free Tier FAQs](https://aws.amazon.com/free/faqs/), [Cognito](https://aws.amazon.com/cognito/pricing/), [EventBridge](https://aws.amazon.com/eventbridge/pricing), [SES](https://aws.amazon.com/ses/pricing/), [SES pricing plans (July 2026)](https://aws.amazon.com/about-aws/whats-new/2026/07/amazon-ses-pricing-plans/), [CodePipeline](https://aws.amazon.com/codepipeline/pricing), [CodeBuild](https://aws.amazon.com/codebuild/pricing), [Aurora DSQL](https://aws.amazon.com/rds/aurora/dsql/pricing/), [VPC/NAT costs 2026](https://www.atlantic.net/managed-services/vpc-pricing-in-2026-nat-vpn-ip-and-data-transfer-costs.md)
- Hosting: [Free tiers compared (Sept 2026)](https://flaviocopes.com/hosting-free-tiers/), [Vercel vs Netlify vs Cloudflare 2026](https://dev.to/lazydev_oh/vercel-vs-netlify-vs-cloudflare-pages-2026-deep-comparison-with-real-numbers-8pl)
- GitHub Actions: [billing & limits](https://docs.github.com/en/actions/reference/usage-limits-billing-and-administration), [scheduled workflow delays discussion](https://github.com/orgs/community/discussions/185355)
