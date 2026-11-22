# Cleaning Planner — Claude Context

## Status

Phase 0 (foundations). `docs/PLAN.md` is the agreed source of truth for scope, stack and phases. Read it before starting any work, and update it when a decision changes.

## README

`README.md` is the developer setup guide for the whole repo. If your changes affect anything it documents — stack choices, env vars, CI/CD behaviour, local setup steps, or repo structure — update `README.md` to match.

## Git workflow — non-negotiable rules

`development` is the default branch; `production` is what's deployed. Both are protected by GitHub rulesets (no direct pushes, PR + passing checks required, no bypass).

**For every change, no matter how small:**

1. `git switch development && git pull`, then branch off it: `feature/<name>`, `fix/<name>` or `chore/<name>`.
2. Do the work on that branch (TDD as below).
3. Before pushing, run and pass: `npm run format:check && npm run lint && npm run typecheck && npm test`. Fix failures; never push a branch you know fails.
4. Push the branch and open a PR **into `development`**. Wait for **PR checks passed**; fix and push again until it's green. Squash-merge only when it passes.
5. To release, open a PR **from `development` into `production`** (title `Release: <summary>`). Wait for **Release checks passed** (e2e on 3 devices, builds, audit). Merge with a merge commit only when it passes.
6. The merge into `production` deploys automatically (Vercel + CodePipeline). Afterwards, check the pipeline and `/v1/health`.

Never: commit or push directly to `development` or `production`; open a PR into `production` from any branch other than `development`; merge with failing or pending checks; force-push either branch; disable or weaken the rulesets or required checks.

## What this is

Household cleaning planner (installable web app / PWA). Users see what needs cleaning today, this week and later, with recommended frequencies they can adjust, and get reminders (Web Push, optional email). Households with multiple members are modelled in the database from day one but exposed later.

## Repo structure

```
apps/
  web/            Next.js App Router PWA, deployed to Vercel
  api/            Express on AWS Lambda (controllers → service → data), bundled with esbuild
packages/
  schedule/       Pure TypeScript recurrence engine + task library (shared by web, api and reminders)
infrastructure/
  template.yml    SAM/CloudFormation: API, DynamoDB, budget, self-updating CodePipeline
  buildspec.yml   CodeBuild steps run by the pipeline
docs/             PLAN.md and decision records
```

Each app/package has its own `CLAUDE.md` with local rules. Read it before working there.

## Stack

| Layer          | Choice                                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo       | Turborepo + npm workspaces                                                                                                                      |
| Frontend       | Next.js App Router, Tailwind, shadcn/ui, PWA (manifest + service worker), Vercel                                                                |
| API            | Express 5 on Lambda (Node 24, arm64) behind API Gateway HTTP API                                                                                |
| Data           | DynamoDB, single table (`pk`/`sk`), on-demand, point-in-time recovery                                                                           |
| Auth           | Cognito user pool, JWT authorizer on the HTTP API _(Phase 1)_                                                                                   |
| Notifications  | Web Push (VAPID) + SES email from a `notify` Lambda on EventBridge Scheduler _(Phase 2)_                                                        |
| Infrastructure | CloudFormation/SAM in `infrastructure/template.yml`, region `ap-southeast-2`                                                                    |
| CI/CD          | GitHub Actions: PR checks (→ development), release checks (→ production), Vercel deploy; AWS CodePipeline deploys the backend from `production` |

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
- Template changes must pass `cfn-lint` (run in both PR and release checks).

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
- Validate only at system boundaries (forms, API request bodies, external API responses).

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
- Every API endpoint that touches household data has a test proving a non-member gets a 403 and cannot read or write that household's items.
