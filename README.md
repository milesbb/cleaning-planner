# Cleaning Planner

> Know what needs cleaning today, this week, and when the next deep clean is due, with reminders on your phone.

A household cleaning planner for the people who share a home. It covers everyday jobs (vacuuming, dusting, mopping) through to the easily forgotten deep cleans (washing-machine seal and drain filter, dishwasher filter and cleaning tablet, oven, extractor filter). Each task comes with a **recommended frequency** you can adjust, and the app **reminds you** when things are due.

**Status:** Phase 0 (foundations). See [docs/PLAN.md](docs/PLAN.md) for the full proposal, research, cost estimate and roadmap.

## Planned features

- 📋 **Task library with recommended frequencies.** Sensible defaults and ranges, plus _how to_ and _why it matters_.
- 🗓️ **Flexible schedules.** "Every 2 weeks after it was last done" or fixed days ("every Saturday", "1st of the month").
- ✅ **Today / Tomorrow / This week** views. One tap to mark done, snooze or skip.
- 🔔 **Reminders.** A daily "today's jobs" push notification and a weekly summary, at times you choose (email optional).
- 🏠 **Households.** Share with a partner or housemates, assign tasks or take turns, see who did what.
- 👤 **Accounts.** Email and password, with password reset, account settings and full account deletion.
- 📱 **Website, iOS app and Android app** from one codebase, each working at every screen size from a small phone to a large desktop.
- 🔒 **Safe and quick.** Strict security rules, offline-first data, and speed budgets enforced in CI ([docs/IMPLEMENTATION.md §4](docs/IMPLEMENTATION.md)).

## Stack

| Layer            | Choice                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| Monorepo         | Turborepo + npm workspaces                                                                                   |
| Web app          | Next.js (App Router, static export) + TypeScript + Tailwind v4 + shadcn/ui, installable PWA, on Vercel       |
| iOS and Android  | Capacitor wrapping the same web build, with native push (FCM), haptics and deep links; fastlane for releases |
| API              | Express 5 on AWS Lambda (Node 24, arm64) behind API Gateway HTTP API, bundled with esbuild                   |
| Data             | DynamoDB (single table, on-demand, point-in-time recovery)                                                   |
| Scheduling       | `packages/schedule`: pure TypeScript, shared by the web app, API and reminder Lambda                         |
| Auth / reminders | Cognito (email and password); EventBridge Scheduler → Lambda → Web Push, FCM and SES                         |
| Infrastructure   | CloudFormation/SAM (`infrastructure/template.yml`), self-updating CodePipeline + CodeBuild                   |
| Quality          | ESLint (strict type-checked), Prettier, Vitest, React Testing Library + axe, supertest, Playwright, cfn-lint |

Expected AWS cost: **about $0–1 a month** (breakdown in [docs/PLAN.md §7](docs/PLAN.md)).

## Repository layout

```
apps/web            Next.js PWA
apps/api            Express API for Lambda (controllers → service → data)
packages/schedule   Scheduling engine (pure TypeScript, 95% coverage gate)
infrastructure/     CloudFormation template (app + pipeline) and CodeBuild buildspec
docs/               Plan and decision records
.github/            PR check workflows and Dependabot
CLAUDE.md           Claude Code context and rules (plus one per app/package)
```

## Local setup

**Prerequisites:** Node 24 (see `.nvmrc`), npm 11.

```bash
npm install
npm run dev          # web on http://localhost:3000, API on http://localhost:4000
```

Check the API: `curl http://localhost:4000/v1/health`.

### Scripts (from the repo root)

| Command                                                      | What it does                                                                                                                                                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`                                                | Web app and API in dev mode                                                                                                                                                                      |
| `npm run build`                                              | Production build of everything (web + Lambda bundle)                                                                                                                                             |
| `npm run lint`                                               | ESLint across all workspaces                                                                                                                                                                     |
| `npm run typecheck`                                          | `tsc --noEmit` across all workspaces                                                                                                                                                             |
| `npm test`                                                   | Unit tests (Vitest) across all workspaces                                                                                                                                                        |
| `npm run test:integration --workspace=@cleaning-planner/api` | API repository tests against DynamoDB Local: start it with `docker run -p 8000:8000 amazon/dynamodb-local` and set `DYNAMODB_ENDPOINT=http://localhost:8000` (CI runs it as a service container) |
| `npm run test:e2e`                                           | Playwright e2e on desktop, Android and iPhone projects                                                                                                                                           |
| `npm run test:smoke`                                         | Invoke the built Lambda bundle with an API Gateway event (run `npm run build` first)                                                                                                             |
| `npm run format`                                             | Format everything with Prettier (`format:check` to verify only)                                                                                                                                  |
| `npm run knip`                                               | Find unused files, exports and dependencies                                                                                                                                                      |
| `npm run dupes`                                              | Check for copy-pasted code (fails above 3%)                                                                                                                                                      |
| `npm run test:mutation`                                      | Mutation-test the schedule engine with Stryker (fails below 85%)                                                                                                                                 |
| `npm run test:lighthouse`                                    | Lighthouse scores for the built web app (run `npm run build` first; needs Chrome)                                                                                                                |

First run of e2e tests: `npx playwright install chromium webkit` from `apps/web`.

## Branches and workflow

```
feature/… ──PR──► development ──release PR──► production ──► deploys automatically
            fast checks          heavy checks              (Vercel + AWS CodePipeline)
```

| Branch        | Role                        | Rules (GitHub rulesets, no bypass, not even for admins)                                                                                                           |
| ------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `development` | Default branch, integration | No direct pushes; PR required; **"PR checks passed"** must pass; squash merge only; no force-push or deletion                                                     |
| `production`  | What's deployed             | No direct pushes; PR required; **"Release checks passed"** must pass (fails unless the PR comes from `development`); merge commit only; no force-push or deletion |

**Every change, however small:**

1. Branch off `development`: `git switch development && git pull && git switch -c feature/<name>` (or `fix/…`, `chore/…`).
2. Work, then run the local checks until they pass:
   ```bash
   npm run format:check && npm run lint && npm run typecheck && npm test
   ```
3. Push the branch and open a PR into `development`. **PR checks** run; merge (squash) once they pass.
4. To release: open a PR from `development` into `production`. **Release checks** run; merge (merge commit) once they pass.
5. The merge into `production` deploys the web app (Vercel) and the backend (CodePipeline). No AWS commands needed.

## CI/CD

| Workflow             | Runs on                                                      | Jobs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core-checks.yml`    | Called by both checks below                                  | Format, lint & typecheck · unit tests with coverage gates · `cfn-lint`                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `pr-checks.yml`      | PRs into `development`                                       | Format, lint & typecheck · unit tests with coverage gates · `cfn-lint` → **PR checks passed**                                                                                                                                                                                                                                                                                                                                                                                                     |
| `release-checks.yml` | PRs into `production` (or run manually from the Actions tab) | Source branch is `development` · format, lint & typecheck · unit tests · production builds + Lambda smoke test · Playwright e2e on desktop/Android/iPhone · `cfn-lint` · `npm audit` of production deps · **Knip** (dead code/deps) · **jscpd** (duplication ≤ 3%) · **Stryker** mutation testing of the schedule engine (≥ 85%) · **Lighthouse** (accessibility ≥ 95, best practices ≥ 95, SEO ≥ 90) · **Semgrep** SAST · **Gitleaks** secrets scan · **actionlint** → **Release checks passed** |

**Security (GitHub, free because the repo is public)**

- **CodeQL** (`.github/workflows/codeql.yml`, `security-extended` queries) scans JavaScript/TypeScript and the workflow files on every PR, every push to `development`/`production`, and weekly. It runs without path filters because the rulesets need a result for every PR. Both rulesets **block merges** when CodeQL reports an error-level issue or a high/critical security alert.
- **Secret scanning with push protection** rejects pushes that contain credentials.
- **Dependabot** security alerts and automatic security-fix PRs, plus weekly version updates into `development`. Major upgrades of TypeScript, ESLint, `@eslint/js` and `@types/node` are skipped until the toolchain supports them (see `.github/dependabot.yml`).

**Backend deploys: AWS CodePipeline** (defined in `infrastructure/template.yml`, same pattern as playlist-transfer-backend)

1. A push to `production` (i.e. a merged release PR) that touches `apps/api/**`, `packages/schedule/**`, `infrastructure/**` or the lockfile triggers the pipeline.
2. **CodeBuild** (`infrastructure/buildspec.yml`) installs, lints, typechecks, tests, bundles the Lambda, and runs `aws cloudformation package`.
3. **CloudFormation** creates a change set for the stack and executes it. That covers code _and_ infrastructure changes, including changes to the pipeline itself.
4. **Verify**: a small CodeBuild project (`cleaning-planner-health-check`) calls the deployed `/v1/health` and fails the pipeline if it doesn't answer `{ "status": "ok" }` within 10 seconds, so a broken deploy shows up red straight away.

Build logs: CodeBuild → `cleaning-planner-build` (both projects log there). Deploy history: CloudFormation → `cleaning-planner` → Events.

## Deployment setup (one-off)

### 1. AWS backend (bootstrap the stack once)

**Prerequisites:**

- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) and [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html), signed in with your **admin** login (`aws sso login`). Commands below use Sydney (`ap-southeast-2`).
- The **[aws-claude-access](https://github.com/milesbb/aws-claude-access)** stack is deployed. It creates the `workload-permissions-boundary` policy that every IAM role in this template must carry, so the stack fails to create without it.

1. Store the email address for cost alerts:

   ```powershell
   aws ssm put-parameter --name /cleaning-planner/budget-alert-email --type String --value "you@example.com" --region ap-southeast-2
   ```

2. Build the Lambda bundle and deploy the stack (creates the API, table, budget and pipeline):

   ```powershell
   npm ci
   npm run build --workspace=apps/api
   sam deploy --template-file infrastructure/template.yml --stack-name cleaning-planner --region ap-southeast-2 --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND --resolve-s3
   ```

3. **Approve the GitHub connection** (it is created as _Pending_): AWS console → **Developer Tools → Settings → Connections** → `cleaning-planner-github` → **Update pending connection** → install/authorise the AWS Connector GitHub app for `milesbb/cleaning-planner`.

4. Run the pipeline once (after this, merges into `production` trigger it):

   ```powershell
   aws codepipeline start-pipeline-execution --name cleaning-planner --region ap-southeast-2
   ```

5. Note the stack outputs (`ApiUrl` in particular):

   ```powershell
   aws cloudformation describe-stacks --stack-name cleaning-planner --region ap-southeast-2 --query "Stacks[0].Outputs"
   ```

The budget alert is **account-wide** and defaults to $5/month. If the account already runs other projects, raise `MonthlyBudgetUsd` in the template.

### 2. Vercel (web app)

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new) and set **Root Directory** to `apps/web` (framework: Next.js). In **Settings → Git**, set the **Production Branch** to `production`.
2. Add the environment variable `NEXT_PUBLIC_API_URL` = the stack's `ApiUrl` output.
3. Add the Vercel production URL to the `HttpApi` CORS `AllowOrigins` list in `infrastructure/template.yml` and push (the pipeline updates CORS).

Vercel's GitHub integration also gives every pull request its own preview URL. Previews include the review pages, `/dev/components/` (every component in every state) and `/dev/shell/` (the app frame), so you can check them on a phone; the live site never does.

## Licence

Private project, all rights reserved.
