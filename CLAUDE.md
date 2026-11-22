# Cleaning Planner — Claude Context

## Status

Phase 0 (foundations). `docs/PLAN.md` is the agreed source of truth for scope, stack and costs, and `docs/IMPLEMENTATION.md` for the build order, screens, data design and endpoints. Read both before starting any work, and update them when a decision changes.

## README

`README.md` is the developer setup guide for the whole repo. If your changes affect anything it documents — stack choices, env vars, CI/CD behaviour, local setup steps, or repo structure — update `README.md` to match.

## Git workflow — non-negotiable rules

`development` is the default branch; `production` is what's deployed. Both are protected by GitHub rulesets (no direct pushes, PR + passing checks required, no bypass).

**For every change, no matter how small:**

1. `git switch development && git pull`, then branch off it: `feature/<name>`, `fix/<name>` or `chore/<name>`.
2. Do the work on that branch (TDD as below).
3. Before pushing, run and pass: `npm run format:check && npm run lint && npm run typecheck && npm test`. Fix failures; never push a branch you know fails.
   Before opening a release PR, also run `npm run knip && npm run dupes && npm run test:mutation` so the release checks don't fail on them.
4. Push the branch and open a PR **into `development`**. Wait for **PR checks passed**; fix and push again until it's green. Squash-merge only when it passes.
5. To release, open a PR **from `development` into `production`** (title `Release: <summary>`). Wait for **Release checks passed** (e2e on 3 devices, builds, audit). Merge with a merge commit only when it passes.
6. The merge into `production` deploys automatically (Vercel + CodePipeline). Afterwards, check the pipeline and `/v1/health`.

Never: commit or push directly to `development` or `production`; open a PR into `production` from any branch other than `development`; merge with failing or pending checks; force-push either branch; disable or weaken the rulesets or required checks.

The repository is **public**: never commit secrets, personal data or account identifiers (push protection will reject secrets). CodeQL must report no error-level or high-severity issues for a PR to merge; fix the code, never dismiss an alert without the user agreeing.

## What this is

Household cleaning planner, shipped as a **website (PWA), an iOS app and an Android app from one codebase**: `apps/web` is a Next.js static export, and `apps/mobile` wraps that build with Capacitor. Every screen must work at every size, from a 320px phone to a 1920px desktop. Users see what needs cleaning today, this week and later, with recommended frequencies they can adjust, and get reminders (Web Push, optional email). People sign up with email and password and share one or more homes ("households") with the people they live with.

## Repo structure

```
apps/
  web/            Next.js App Router, static export: the website (Vercel) and the UI inside both apps
  mobile/         Capacitor iOS and Android projects wrapping the web build
  api/            Express on AWS Lambda (controllers → service → data), bundled with esbuild
packages/
  schedule/       Pure TypeScript recurrence engine + task library (shared by web, api and reminders)
  contracts/      zod request/response schemas shared by the API and the web app
  infrastructure-rules/  Vitest suite that checks infrastructure/template.yml against the rules below
infrastructure/
  template.yml    SAM/CloudFormation: API, DynamoDB, budget, self-updating CodePipeline
  buildspec.yml   CodeBuild steps run by the pipeline
docs/             PLAN.md and decision records
```

Each app/package has its own `CLAUDE.md` with local rules. Read it before working there.

## Stack

| Layer          | Choice                                                                                                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo       | Turborepo + npm workspaces                                                                                                                                                                                                  |
| Frontend       | Next.js App Router as a static export (`output: 'export'`), Tailwind, shadcn/ui, PWA, Vercel                                                                                                                                |
| Native apps    | Capacitor (iOS + Android) wrapping the same build; FCM push, haptics, share, deep links; fastlane to TestFlight and Play internal testing                                                                                   |
| API            | Express 5 on Lambda (Node 24, arm64) behind API Gateway HTTP API                                                                                                                                                            |
| Data           | DynamoDB, single table (`pk`/`sk`), on-demand, point-in-time recovery                                                                                                                                                       |
| Auth           | Cognito user pool, JWT authorizer on the HTTP API _(Phase 1)_                                                                                                                                                               |
| Notifications  | Web Push (browsers) + Firebase Cloud Messaging (apps) + SES email from a `notify` Lambda on EventBridge Scheduler                                                                                                           |
| Infrastructure | CloudFormation/SAM in `infrastructure/template.yml`, region `ap-southeast-2`                                                                                                                                                |
| CI/CD          | GitHub Actions: PR checks (→ development), release checks (→ production); Vercel's GitHub integration deploys the website from `production` (and previews every PR); AWS CodePipeline deploys the backend from `production` |

## Domain rules

- **Next due dates are derived, never stored.** Compute from the task's schedule rule + its latest completion using `packages/schedule`. Never duplicate due-date logic in the web app or Lambdas.
- Two schedule types: `floating` (N units after last completion) and `fixed` (weekdays / day of month). Every rule must be covered by unit tests, including DST and timezone boundaries.
- Calendar days are `YYYY-MM-DD` strings in the household's timezone; instants (e.g. completion times) are ISO-8601 UTC strings.
- **Every DynamoDB item holding household data lives under `pk = HOUSEHOLD#<id>`**, and every API handler checks that the signed-in user is a member of that household before reading or writing. No endpoint takes a household id without that check.

## Infrastructure rules

- **All AWS resources are defined in `infrastructure/template.yml`.** Never create or change resources by hand in the console (except the one-off GitHub connection approval and the SSM parameters listed in the README).
- Keep it serverless and outside a VPC. Do not add RDS, NAT Gateways, or anything billed per hour without updating the cost section of `docs/PLAN.md` and asking first.
- Least-privilege IAM: give each function only the policies it needs (SAM policy templates such as `DynamoDBCrudPolicy`). Never use `*FullAccess` managed policies.
- **Every IAM role must carry `PermissionsBoundary: workload-permissions-boundary`** (Lambda functions get it from `Globals`). The boundary is defined in the separate `aws-claude-access` repo; never remove it. Keep resource names prefixed with the stack name (`cleaning-planner…`), because the boundary only allows resources with that prefix.
- Your own AWS access (the `claude` profile) is view-only plus starting/retrying the pipeline. Deploys happen by merging a release PR into `production` (or `aws codepipeline start-pipeline-execution` to re-run); never try to deploy with `sam deploy` or change IAM yourself.
- Set `RetentionInDays` on every log group.
- Template changes must pass `cfn-lint` (run in both PR and release checks) and `packages/infrastructure-rules` (part of `npm test`), which fails if a role or function loses the permissions boundary, a log group has no retention, a name doesn't start with the stack name, a `*FullAccess` policy appears, a function gets Cognito permissions, a route uses `ANY` or `OPTIONS` (which stops API Gateway answering browser preflights), or a VPC, NAT Gateway or RDS resource is added. When you add a rule here, add it there with a fixture that breaks it.

---

## Security — non-negotiable rules

Full list with tests: `docs/IMPLEMENTATION.md` §4.1. In short:

- **Authorise on the server, every time.** Every household route goes through the membership (or owner) middleware, with a 403 test for outsiders. Never trust ids, roles or prices sent by the client.
- **Validate every input** with a strict `packages/contracts` schema before any logic: unknown fields rejected, lengths and ranges capped. Same schema on the client for forms.
- **No secrets or personal data in code, logs or URLs.** Logs never include emails, tokens or invite codes. Secrets live in SSM or GitHub secrets only.
- **No `dangerouslySetInnerHTML`, no `eval`, no third-party scripts** on the web; the strict CSP must keep passing. In the apps, tokens live in the Keychain or Keystore, never plain WebView storage.
- Random, unguessable ids and invite codes from a cryptographic source; rate limits and lockouts on anything guessable.
- Least privilege everywhere (IAM, API routes, app permissions). Ask before widening any permission.

## Robustness — non-negotiable rules

Details: `docs/IMPLEMENTATION.md` §4.2.

- Every network call has a timeout and a user-facing failure path; every screen has loading, empty, error and offline states.
- Writes are idempotent (client idempotency key) and conditional (version checks, transactions), so retries and races can't corrupt data.
- Optimistic updates always roll back cleanly on failure, with a message.
- Background work (reminders) retries and dead-letters; alarms tell the owner when something breaks.

## Speed and smoothness — non-negotiable rules

Budgets: `docs/IMPLEMENTATION.md` §4.3 (LCP < 1.5 s on a mid-range phone, INP < 100 ms, CLS < 0.05, first load ≤ 220 KB gzipped JS with ≤ 60 KB specific to the route, tap feedback < 100 ms).

- Show cached data instantly and refresh in the background; update the UI before the server answers.
- Animate only transform and opacity; respect "reduce motion"; reserve space so nothing jumps.
- Don't add a dependency without checking its size; import AWS SDK clients individually.
- Every screen is checked at 320–1920px wide (the Playwright viewport matrix) and must have no horizontal scroll, no axe violations and 44px touch targets.

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

## Readability — non-negotiable rules

Code is written for the human engineer who reviews and maintains it. If a reviewer has to stop and decode something, rewrite it.

### Names

- **Every name says what the thing is or does.** `householdTimezone`, `nextDueDate`, `completedTasks`, never `tz`, `d`, `res`, `tmp`, `data2`.
- **No one-letter names, ever**: not in callbacks (`tasks.map((task) => …)`, not `(t) => …`), loop variables, catch clauses (`catch (error)`), comparators or tests. The only exception is `_` for an intentionally unused parameter. ESLint `id-length` enforces this.
- No unexplained abbreviations. Spell words out (`interval`, not `intv`; `response`, not `resp`). Well-known acronyms (`id`, `url`, `api`, `ui`) are fine.
- Booleans read as yes/no questions: `isOverdue`, `hasCompletions`, `canSnooze`.
- Functions are verbs or describe what they return: `addInterval`, `formatLongDate`, `isCalendarDate`.

### Comments

- **Comments are a last resort.** Code must explain itself through names, small functions and clear structure. If you feel a comment is needed, first rename or extract until it isn't.
- The only acceptable comment explains a **why** that code cannot express: an external constraint, a platform bug, or a deliberate non-obvious choice. Never comment _what_ code does, never leave commented-out code, never add TODOs without a linked issue.
- No inline (end-of-line) comments (ESLint `no-inline-comments`).

### Functions and structure

- **Small and single-purpose.** Aim for ~20 lines; ESLint fails anything over 40 (tests excepted), more than 4 parameters, nesting deeper than 3, or cyclomatic complexity over 10. Extract named helpers rather than raising limits.
- One level of abstraction per function: a function either orchestrates named steps or does one low-level thing, not both.
- No nested ternaries (`no-nested-ternary`); extract a named helper or use early returns.
- Prefer early returns over `else` chains. Prefer `async/await` over promise chains.
- Files stay focused and under 300 lines (enforced). One component, router, or concept per file; file names match their main export (`next-due.ts` exports `nextDueDate`).
- Organise by feature/layer exactly as described in each package's `CLAUDE.md`; a reviewer should be able to guess where something lives before searching.

### DRY and robustness

- **Don't repeat knowledge.** If the same logic, constant or rule appears twice, extract it to one named place (shared config like `eslint.shared.mjs`, a helper, or `packages/schedule`). jscpd fails release checks above 3% duplication.
- But don't abstract speculatively: wait for real duplication, not imagined future cases.
- **Robust at the edges, simple inside**: validate everything entering the system (request bodies, form input, external responses, environment variables) and fail loudly with a clear error; trust types internally instead of re-checking impossible states.
- Handle every error path deliberately (map to an `AppError`, show a user-facing message, or let it reach the error handler). Never swallow errors silently.
- No magic numbers or strings: name them (`DAYS_PER_WEEK`, `MAX_SNOOZE_DAYS`).

### Before you finish any change

Re-read your diff as a reviewer would: names obvious, no comments that restate code, no duplication, functions short, files in the right place. `npm run lint` must pass; it enforces the mechanical parts of these rules.

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

### Implementation

- Simple over clever. No feature flags or speculative generality.

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
- Every API endpoint that touches household data has a test proving a non-member gets a 403 and cannot read or write that household's items.
