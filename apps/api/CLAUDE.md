# API — Claude Context

## README

`README.md` at the repo root is the developer setup guide. If your changes affect anything it documents — env vars, SSM parameters, CI/CD steps, deploy/bootstrap instructions — update `README.md` to match.

Express 5 app running on AWS Lambda (Node 24, arm64) via `@codegenie/serverless-express`, behind an API Gateway **HTTP API**. Infrastructure lives in `infrastructure/template.yml`; the CodePipeline defined there bundles and deploys this app on every merge into `production`, then checks `/v1/health`. It doesn't re-run lint, typecheck or tests: the GitHub release checks already passed for that commit. Its build runs on ARM with npm and Node downloads cached in the artifact bucket, so `infrastructure/buildspec.yml` must install every workspace the API imports (today `apps/api`, `packages/contracts`, `packages/schedule`).

## Key files

| File                                | Purpose                                                                                                                                                                       |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app.ts`                        | `createApp(config)` — wires middleware, routers, 404 and the error handler. Used by tests.                                                                                    |
| `src/composition.ts`                | `createServices(environment)`: builds the table, repositories, Cognito reader and services. Shared by `lambda.ts` and `app-local.ts`.                                         |
| `src/controllers/me.ts`             | `GET` / `PATCH /v1/me`: the signed-in person's profile, created on first call.                                                                                                |
| `src/services/profile-service.ts`   | Profile rules: create from Cognito on first call with a stable default colour; only ever the signed-in person.                                                                |
| `src/identity/cognito-identity.ts`  | Reads email and name with Cognito `GetUser` and the caller's own access token (no IAM permission needed).                                                                     |
| `src/data/profile-repository.ts`    | Profile item (`USER#id` / `PROFILE`); name and colour changes update every home's member item in the same transaction.                                                        |
| `src/lambda.ts`                     | Lambda entry point (`lambda.handler`). No logic here.                                                                                                                         |
| `src/app-local.ts`                  | Local dev server on port 4000 (`npm run dev`).                                                                                                                                |
| `src/controllers/`                  | One router per resource. HTTP parsing and responses only.                                                                                                                     |
| `src/middlewares/error-handler.ts`  | Maps `AppError` to its status, malformed JSON to 400, everything else to a logged 500.                                                                                        |
| `src/utils/errors.ts`               | `AppError` (status, contract error code, message, optional field errors) and the `Errors.*` factory. Throw these, never plain strings.                                        |
| `src/utils/validation.ts`           | `parseOrThrow(schema, value)`: parse with a `packages/contracts` schema or throw a 400 with one message per field.                                                            |
| `src/middlewares/signed-in-user.ts` | `signedInUser(readClaims)` (401 without a valid access token's claims) and `signedInUserOf(response)`. Lambda reads claims from API Gateway; tests and local dev inject them. |
| `src/middlewares/membership.ts`     | `requireMember` / `requireOwner`: load the membership once per request from `:householdId` (403 for outsiders, and for members on owner-only routes).                         |
| `src/data/table.ts`                 | `connectToTable` (one DocumentClient, `TABLE_NAME`, optional `DYNAMODB_ENDPOINT` for DynamoDB Local) and `Keys`: the only place pk/sk strings are built.                      |
| `src/data/membership-repository.ts` | Memberships: both sides written in one conditional transaction, `findMembership`, `listHomesOf`.                                                                              |
| `src/utils/logging.ts`              | JSON-lines `logger` for CloudWatch. Never use `console.*`. Redacts email addresses, tokens, passwords and invite codes, by field name and by pattern.                         |
| `src/deploy-check/`                 | `checkHealth` and `runHealthCheck`: the post-deploy check the pipeline runs against `/v1/health`.                                                                             |
| `src/health-check.ts`               | Entry point for that check (`dist/health-check.mjs`). No logic here.                                                                                                          |
| `build.mjs`                         | esbuild bundles → `dist/lambda.js` (CommonJS, git SHA baked in as `APP_VERSION`) and `dist/health-check.mjs`.                                                                 |

## Layer responsibilities (same as Ride Logger)

| Layer       | Folder             | Rule                                                                             |
| ----------- | ------------------ | -------------------------------------------------------------------------------- |
| Controllers | `src/controllers/` | Parse + validate the request, call a service, send the response. No logic.       |
| Services    | `src/services/`    | Business rules and household membership checks. No HTTP, no DynamoDB calls.      |
| Data        | `src/data/`        | DynamoDB access only (AWS SDK v3 `DynamoDBDocumentClient`). One file per entity. |
| Utils       | `src/utils/`       | Shared plumbing. Never imports from controllers or services.                     |

## Rules

- All routes live under `/v1/`. API Gateway only forwards `/v1/{proxy+}` to this function.
- **Every route that reads or writes household data must verify membership in the service layer** and return 403 otherwise. Add a test for the non-member case.
- The table name comes from `process.env.TABLE_NAME` (set by the template). Never hard-code resource names or ARNs.
- Secrets (e.g. VAPID private key) live in SSM Parameter Store under `/cleaning-planner/…`; env vars hold the parameter **name**, and the value is fetched at runtime and cached. Grant `ssm:GetParameter` for that exact parameter in the template.
- CORS is handled by API Gateway (`AllowedOrigins` in the template), not by Express.
- Keep the bundle small: import AWS SDK v3 clients individually; no heavy dependencies without a reason.

## Test-driven development — non-negotiable rules

1. Write a failing test that specifies the expected behaviour.
2. Write the minimum code to make it pass.
3. Refactor — keep the test green.

- **Controllers:** supertest against `createApp(...)`, mocking the service layer.
- **Services:** mock the data layer.
- **Data:** `*.integration.test.ts` next to the repository, run against DynamoDB Local with `npm run test:integration` (CI starts it as a service container). Each test file creates its own table. The unit test run excludes `src/data/`; the integration run has its own 90% coverage gate for it.
- **Bug fixes:** start with a failing test that reproduces the bug.

## Tests

- Vitest; tests sit next to the source (`health.ts` → `health.test.ts`). Run `npm test` from `apps/api`.
- Coverage gate is **90%** (lines, branches, functions, statements), excluding `lambda.ts` and `app-local.ts`.
- CI also bundles the app and invokes `dist/lambda.js` with a sample API Gateway v2 event as a smoke test.

## Types

- Explicit return types everywhere (enforced). No `any`, no `as` assertions (enforced); `unknown` only when narrowed immediately.
- `interface` for object shapes, `type` for unions. Prefix intentionally unused parameters with `_` (needed for Express error middleware).
