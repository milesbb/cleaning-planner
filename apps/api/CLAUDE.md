# API — Claude Context

## README

`README.md` at the repo root is the developer setup guide. If your changes affect anything it documents — env vars, SSM parameters, CI/CD steps, deploy/bootstrap instructions — update `README.md` to match.

Express 5 app running on AWS Lambda (Node 24, arm64) via `@codegenie/serverless-express`, behind an API Gateway **HTTP API**. Infrastructure lives in `infrastructure/template.yml`; the CodePipeline defined there builds, tests and deploys this app on every push to `main` that touches it.

## Key files

| File                               | Purpose                                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/app.ts`                       | `createApp(config)` — wires middleware, routers, 404 and the error handler. Used by tests. |
| `src/lambda.ts`                    | Lambda entry point (`lambda.handler`). No logic here.                                      |
| `src/app-local.ts`                 | Local dev server on port 4000 (`npm run dev`).                                             |
| `src/controllers/`                 | One router per resource. HTTP parsing and responses only.                                  |
| `src/middlewares/error-handler.ts` | Maps `AppError` to its status, malformed JSON to 400, everything else to a logged 500.     |
| `src/utils/errors.ts`              | `AppError` and the `Errors.*` factory. Throw these, never plain strings.                   |
| `src/utils/logging.ts`             | JSON-lines `logger` for CloudWatch. Never use `console.*`.                                 |
| `build.mjs`                        | esbuild bundle → `dist/lambda.js` (CommonJS) with the git SHA baked in as `APP_VERSION`.   |

## Layer responsibilities (same as Ride Logger)

| Layer       | Folder             | Rule                                                                             |
| ----------- | ------------------ | -------------------------------------------------------------------------------- |
| Controllers | `src/controllers/` | Parse + validate the request, call a service, send the response. No logic.       |
| Services    | `src/service/`     | Business rules and household membership checks. No HTTP, no DynamoDB calls.      |
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
- **Data:** run against DynamoDB Local (added with the first data file in Phase 1).
- **Bug fixes:** start with a failing test that reproduces the bug.

## Tests

- Vitest; tests sit next to the source (`health.ts` → `health.test.ts`). Run `npm test` from `apps/api`.
- Coverage gate is **90%** (lines, branches, functions, statements), excluding `lambda.ts` and `app-local.ts`.
- CI also bundles the app and invokes `dist/lambda.js` with a sample API Gateway v2 event as a smoke test.

## Types

- Explicit return types everywhere (enforced). No `any`, no `as` assertions (enforced); `unknown` only when narrowed immediately.
- `interface` for object shapes, `type` for unions. Prefix intentionally unused parameters with `_` (needed for Express error middleware).
