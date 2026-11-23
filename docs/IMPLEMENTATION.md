# Cleaning Planner: Implementation plan

Status: **in progress** (updated 2026-11-22). This turns the designs into an ordered list of pull requests. `PLAN.md` explains _why_ (scope, stack, costs); this file explains _what we build, in what order_.

Every item below follows the security, robustness and speed rules in §4 and is one branch → PR into `development` → **PR checks passed**, following the Git workflow in `CLAUDE.md`. Each milestone ends with a release PR into `production`.

The work is tracked as GitHub issues grouped into milestones **M0 · Foundations** to **M8 · iOS and Android apps**. Each issue lists the tests its PR must add or update and the issues it depends on. Issues labelled `owner action` need the repo owner's logins, payments or accounts.

---

## 1. What we are building

**One product on three platforms, from one codebase:**

| Platform    | What people get                                                 | How it's built                                               |
| ----------- | --------------------------------------------------------------- | ------------------------------------------------------------ |
| Website     | Works in any browser, installable as a PWA                      | `apps/web` (Next.js), static export hosted on Vercel         |
| iOS app     | App Store app with native push, haptics and invite deep links   | `apps/mobile` (Capacitor) wrapping the same `apps/web` build |
| Android app | Google Play app with native push, haptics and invite deep links | `apps/mobile` (Capacitor) wrapping the same `apps/web` build |

**Every screen works perfectly at every size**, from a 320px-wide phone to a 1920px desktop, in portrait and landscape. See §3.

The designs live in the private design canvas (owner can share it). We build the **Wall chart with art** version: the Wall chart layouts and components with the softened palette, and an `ArtFrame` that shows a plain room icon until commissioned art arrives.

### Screens to build

Routes that refer to a specific record use a query parameter (`?id=`), because a static export can't pre-render every user's ids (§2).

| Area      | Screen (design name)                       | Route                            |
| --------- | ------------------------------------------ | -------------------------------- |
| Account   | Welcome / log in                           | `/welcome`                       |
| Account   | Create account (name, email, password)     | `/sign-up`                       |
| Account   | Email code (confirms the email at sign-up) | `/verify`                        |
| Account   | Log in (email, password)                   | `/sign-in`                       |
| Account   | Forgot password                            | `/forgot-password`               |
| Account   | Set a new password (code and new password) | `/forgot-password/reset`         |
| Account   | Your account                               | `/settings/account`              |
| Account   | Change password                            | `/settings/account/password`     |
| Account   | Delete account                             | `/settings/account/delete`       |
| Household | Start or join a home                       | `/homes/new`                     |
| Household | Accept an invite                           | `/join?code=`                    |
| Household | Home settings and members                  | `/settings/home`                 |
| Household | Switch home                                | bottom sheet on every tab        |
| Setup     | Pick rooms (step 1 of 3)                   | `/setup/rooms`                   |
| Setup     | Appliances (step 2 of 3)                   | `/setup/appliances`              |
| Setup     | Reminders (step 3 of 3)                    | `/setup/reminders`               |
| Planning  | Today (and the all-done state)             | `/today`                         |
| Planning  | This week                                  | `/week`                          |
| Planning  | Home: rooms                                | `/home`                          |
| Planning  | Room                                       | `/room?id=`                      |
| Planning  | Job detail                                 | `/job?id=`                       |
| Planning  | Add a job                                  | `/room/add?id=`                  |
| Settings  | Settings and reminders                     | `/settings`                      |
| Legal     | Privacy policy, terms, support             | `/privacy`, `/terms`, `/support` |

`/` redirects to `/welcome` when signed out, `/homes/new` when signed in with no home, otherwise `/today`.

---

## 2. Architecture

```
                         ┌──────────── one build of apps/web (static export) ────────────┐
                         ▼                                ▼                               ▼
                Vercel (website + PWA)          Capacitor iOS app                Capacitor Android app
                         │                                │                               │
                         └──────────── HTTPS + JWT ───────┴───────────────────────────────┘
                                                          ▼
          AWS: API Gateway → Lambda "api" → DynamoDB      Cognito (email + password)
               EventBridge Scheduler → Lambda "notify" → Web Push (browsers) · FCM (iOS + Android) · SES (email)
```

- **Static export.** `apps/web` builds with `output: 'export'`: plain HTML, CSS and JS with no server code. All data comes from the API at runtime, signed-in state lives on the device, and pages read record ids from the query string. The same `out/` folder is deployed to Vercel and bundled into both apps, so there is one UI to build and test.
- **Native shell (`apps/mobile`).** Capacitor 7 projects for iOS and Android, committed to the repo. Native plugins used through small wrappers in `apps/web/src/lib/native/` that fall back to web behaviour in a browser: push notifications, haptics on "done", share sheet for invites, status bar and splash screen, app badge for late jobs, deep links.
- **Push.** Browsers and the installed PWA use **Web Push** (VAPID). The iOS and Android apps use **Firebase Cloud Messaging**, which delivers to iOS through Apple's push service with our APNs key. The `notify` Lambda sends to whichever devices a person has registered.
- **Invite links** (`https://<our domain>/join?code=…`) open the app when it's installed (iOS universal links, Android app links) and the website otherwise. This needs our own domain, serving `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`.
- **API origins.** CORS allows the website's origin plus the Android WebView (`https://localhost`). API Gateway only accepts http(s) origins, so the iOS app (`capacitor://localhost`) calls the API through Capacitor's native HTTP (`CapacitorHttp`), which CORS doesn't apply to.
- **Releases.** A merge into `production` deploys the website (Vercel) and backend (CodePipeline), and GitHub Actions builds signed apps and uploads them to **TestFlight** and the **Google Play internal testing** track. Promoting a build to the public stores is a button press in each store console, after store review.

### Monorepo layout

```
apps/
  web/        Next.js static export: every screen, used by all three platforms
  mobile/     Capacitor config plus the generated ios/ and android/ projects
  api/        Express on Lambda, plus the notify Lambda
packages/
  schedule/   scheduling engine and job library (done)
  contracts/  zod request/response schemas shared by api and web
infrastructure/
```

---

## 3. Responsive layouts: every size, both orientations

| Range         | Typical device                     | Layout                                                                                                        |
| ------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 320–639px     | Phones                             | The designs as drawn: single column, bottom tab bar, bottom sheets                                            |
| 640–1023px    | Large phones in landscape, tablets | Wider single column (max 40rem) with two-column grids for rooms and setup choices; bottom tab bar             |
| 1024–1439px   | Laptops, tablets in landscape      | Left navigation rail; Today shows Late/Today/Tomorrow beside the week strip; Job detail opens as a side panel |
| 1440px and up | Desktops                           | Same as laptop, content capped at 80rem and centred, with more breathing room                                 |

- Tablet and desktop layouts get designed on the canvas before the screens are built (#92), so they're decisions, not accidents.
- Touch targets stay 44×44px at every size; hover is only ever an extra, never the only way to do something; everything works with a keyboard.
- Text stays readable when the browser or phone font size is raised to 200%.
- **Tests.** A shared Playwright helper runs every screen at 320, 375, 390, 412, 768, 1024, 1280, 1440 and 1920px wide, plus phones in landscape. Each run checks no horizontal scrolling, no axe violations, and touch targets of at least 44px, and saves a screenshot. It runs in release checks, so a layout that breaks at any size can't ship.

---

## 4. Security, robustness and speed: rules for every PR

These apply to every issue. A PR isn't done until it meets them and has tests proving it. The PR template has a checklist for each.

### 4.1 Security

| Area              | What we do                                                                                                                                                                                                                          | How it's tested                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Sign-in           | Cognito SRP (the password never leaves the device in plain form), 12+ character passwords, built-in lockout after repeated failures, 1-hour access tokens with refresh, password re-entry for account deletion and password change. | Screen tests for every auth error; API tests that expired or missing tokens get 401.                     |
| Tokens on devices | Web: tokens only in browser storage the strict CSP protects (no third-party scripts at all). Apps: tokens in the iOS Keychain and Android Keystore through a secure-storage adapter for Amplify, never in plain WebView storage.    | Unit tests for the storage adapter; a check that release builds use it.                                  |
| Authorisation     | Every household route checks membership in one middleware; owner-only actions check ownership. Ids are random (no guessable sequences).                                                                                             | A 403 test for non-members on every household route, and for members on owner routes.                    |
| Input             | Every request body, query and path parameter is parsed with a strict zod schema (unknown fields rejected, lengths and ranges capped) before any logic runs. The web app validates forms with the same schemas.                      | Contract tests per schema; API tests for malformed input getting a 400 with field errors.                |
| Invites           | Codes come from a cryptographic random source (about 40 bits), expire after 7 days and are single-use per person. Preview and accept are rate limited per IP and per account, with a lockout after repeated wrong codes.            | Tests for expiry, reuse, wrong-code lockout and the code generator's alphabet and length.                |
| Abuse and cost    | API Gateway throttling per route (tighter on invites and account routes), Lambda timeouts, payload size limits, the AWS budget alarm.                                                                                               | Template rule tests check every route has throttling and every function a timeout.                       |
| Web headers       | Strict Content-Security-Policy (self only plus our API and Cognito), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, no framing.                                                                           | Playwright checks the headers on the deployed preview and that the CSP blocks an injected inline script. |
| Apps              | HTTPS only (Android network security config, iOS App Transport Security), WebView navigation limited to our own pages, WebView debugging off in release builds, deep-link codes validated before use.                               | Native config checks in the app build job.                                                               |
| Data and privacy  | Only name and email stored about people; encryption at rest (DynamoDB, SSM SecureString); no personal data or tokens in logs; full account deletion; privacy policy describing exactly this.                                        | Logger tests that redact emails and tokens; deletion tests prove nothing is left.                        |
| Supply chain      | Actions pinned to SHAs, Dependabot with a cooldown, `npm audit`, CodeQL, Semgrep, Gitleaks, secret scanning with push protection, least-privilege IAM inside a permissions boundary.                                                | Already in PR and release checks.                                                                        |

### 4.2 Robustness

- **Nothing fails silently.** Every request has a timeout and retries with back-off where it's safe. Every screen has designed loading, empty, error and offline states with a retry.
- **Offline-first.** The app keeps its last data on the device (persisted query cache), opens instantly with it, and queues ticks, snoozes and skips made offline, replaying them when back online.
- **Safe retries.** Completions, snoozes and other writes carry a client-made idempotency key, so a retried request never double-counts.
- **No lost updates.** DynamoDB writes use conditions and transactions: version checks on edits, and both sides of a membership written together.
- **Reminders never silently stop.** Scheduler retries plus a dead-letter queue for failed `notify` runs; push devices that have gone away are removed.
- **We hear about problems first.** CloudWatch alarms on API 5xx, Lambda errors and dead-letter messages email the owner.
- **Tests at every level**: unit (with mutation testing on core logic), API integration against DynamoDB Local, end-to-end on desktop, Android and iPhone, and the viewport matrix.

### 4.3 Speed and smoothness

| Budget                    | Target                                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Largest Contentful Paint  | under 1.5 s on a mid-range phone (Lighthouse mobile)                                                                               |
| Interaction to Next Paint | under 100 ms                                                                                                                       |
| Cumulative Layout Shift   | under 0.05                                                                                                                         |
| JavaScript per route      | first load at most 220 KB gzipped (the shared Next.js and React runtime is about 170 KB), with at most 60 KB specific to the route |
| Tap feedback              | under 100 ms, every time                                                                                                           |
| API (warm)                | p95 under 300 ms for the agenda and writes                                                                                         |

- **Instant by default.** Cached data shows immediately and refreshes in the background. Ticking a job updates the screen before the server answers. Next page data is prefetched when a link scrolls into view.
- **No jank.** Animations use transform and opacity only, run at 60fps, and respect "reduce motion". Space is reserved for content so nothing jumps. Fonts load with matched fallbacks.
- **Small and lean.** Static files from a CDN, route-level code splitting, no heavy libraries without a reason, a small Lambda bundle with AWS SDK clients imported one by one.
- **Enforced in CI.** Release checks fail if Lighthouse (mobile, throttled) scores below 0.9 for performance, LCP goes over 2.5 s on its slowed-down test phone (comfortably under 1.5 s on a real mid-range phone), CLS over 0.05 or total blocking time over 200 ms, or if `npm run check:bundle-size` finds a route over its JavaScript budget.

---

## 5. Milestones at a glance

| #   | Milestone                     | Ends with                                                                                        |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------ |
| 0   | Foundations                   | Backend and website deploy on merge; domain, Apple, Google and Firebase accounts ready           |
| 1   | Design system in code         | Components built and tested at every size; static export; tablet/desktop layouts designed        |
| 2   | Scheduling engine and library | **Done**                                                                                         |
| 3   | Accounts and data API         | Sign up and log in; homes, rooms, jobs and history via the API                                   |
| 4   | Account and household screens | A new person can sign up, start or join a home and finish setup, on every size                   |
| 5   | Planning screens              | We use Today, Week, Home and Job detail daily                                                    |
| 6   | Reminders                     | Daily and weekly reminders arrive in browsers and in both apps                                   |
| 7   | Polish and art                | Commissioned art in, accessibility and Lighthouse green, legal pages                             |
| 8   | iOS and Android apps          | Both apps on TestFlight / Play internal testing from every release, then submitted to the stores |

M8's shell and build pipeline start as soon as the static export lands in M1, so the apps grow alongside the website rather than at the end.

---

## 6. Milestone 0: foundations

Done: monorepo, CI, release checks (green), CloudFormation template, pipeline and post-deploy health check. Still to do, all by the repo owner:

1. **AWS bootstrap** (#13): budget-email SSM parameter, `sam deploy` once with an admin login, approve the GitHub connection, start the pipeline.
2. **App name and app id** (#85), then a **domain** (#86): buy a domain and point it at Vercel. Needed for invite deep links, the SES sender address and the store listings.
3. **Vercel** (#15): import the repo, add the GitHub secrets and `NEXT_PUBLIC_API_URL`.
4. **Apple** (#87), **Google Play** (#88) and **Firebase** (#89) accounts: can start any time; Apple enrolment can take a few days.

---

## 7. Milestone 1: design system in code (`apps/web`)

One PR per item. Every component gets a test file with the axe check first.

1. **Tokens and fonts** (#16).
2. **Static export** (#90): `output: 'export'`, no server-only features, `next/image` without the image server, a CI check that the export builds. Done early so nothing gets built that can't ship in the apps.
3. **Viewport matrix** (#91): the Playwright viewport matrix from §3 as a reusable helper, run on the existing pages.
4. **Tablet and desktop layouts** (#92): design the 640px, 1024px and 1440px versions of the main screens on the canvas.
5. **Security headers and CSP** (#93) and **performance budgets in CI** (#94).
6. **Icons** (#17), **primitives** (#18), **form fields** (#19), **choice controls** (#20), **job pieces** (#21).
7. **App shell** (#22): bottom tab bar on phones, left rail from 1024px, bottom sheet on phones and a centred dialog on larger screens, safe areas for notches and home indicators.
8. **`ArtFrame`** (#23) and the **components page** (#24), reviewed at every size.

---

## 8. Milestone 2: scheduling engine and job library: done

`packages/schedule` has fixed and floating schedules, snooze and skip, due status in each home's time zone, who does it (including taking turns), `buildAgenda`, spreading first due dates, and 32 library jobs. Mutation scores are 93–98% per file.

---

## 9. Milestone 3: accounts and data API (`apps/api`, `infrastructure`)

### 9.1 Infrastructure

- **Cognito user pool**, Essentials tier, sign-in with **email and password**. Email is the username, confirmed with a six-digit code; forgotten passwords are reset with an emailed code. Password minimum 12 characters with no forced symbols. One public app client with no secret, SRP sign-in plus refresh, refresh tokens for 365 days. Cognito's built-in email sender at first, SES in M6.
- **JWT authorizer** on every `/v1` route except `/v1/health`; **TTL** on the table for invite codes; `cognito-idp:*` and `scheduler:*` for the deploy role (already inside the permissions boundary).
- **CORS** gains `https://localhost` for the Android app; the iOS app uses `CapacitorHttp`, because API Gateway rejects `capacitor://` origins.
- Automated tests for the infrastructure rules in `CLAUDE.md` (#32).
- **Alarms** (#95): API 5xx, Lambda errors and the reminders dead-letter queue email the owner.

### 9.2 Shared types

`packages/contracts`: zod schemas for every request and response, used by the API to validate and by the web app's typed client.

### 9.3 API structure

```
apps/api/src/
  routes/        one router per resource
  controllers/   parse and validate, call a service, shape the response
  services/      business rules (membership, ownership, invites, account deletion)
  data/          DynamoDB repositories, the only code that knows pk/sk
  middlewares/   signed-in user from JWT claims, membership checks, errors
```

`requireMember` and `requireOwner` load the membership once per request; every route under `/households/:householdId` uses one, with a test proving a non-member gets 403.

### 9.4 Data design (single table)

| Item                    | pk               | sk                        | Holds                                                                                 |
| ----------------------- | ---------------- | ------------------------- | ------------------------------------------------------------------------------------- |
| Profile                 | `USER#<userId>`  | `PROFILE`                 | name, email, person colour                                                            |
| Reminder settings       | `USER#<userId>`  | `REMINDERS`               | time zone, daily time, weekly day and time (each on or off), only my jobs, also email |
| My homes                | `USER#<userId>`  | `HOUSEHOLD#<householdId>` | home name and my role (for the switcher, one query)                                   |
| Push device             | `USER#<userId>`  | `PUSH#<deviceHash>`       | kind (`webPush` or `fcm`), the subscription or FCM token and platform, added at       |
| Device owner            | `DEVICE#<hash>`  | `OWNER`                   | who the device belongs to now: registering it moves it from the last person           |
| Home                    | `HOUSEHOLD#<id>` | `META`                    | name, timezone, week start, owner                                                     |
| Member                  | `HOUSEHOLD#<id>` | `MEMBER#<userId>`         | display name, colour, role                                                            |
| Room                    | `HOUSEHOLD#<id>` | `ROOM#<roomId>`           | type, name, order, appliances                                                         |
| Job                     | `HOUSEHOLD#<id>` | `JOB#<jobId>`             | room, library id, name, icon, schedule, assignment, snooze                            |
| Completion              | `HOUSEHOLD#<id>` | `DONE#<jobId>#<doneAt>`   | done by, skipped                                                                      |
| Activity                | `HOUSEHOLD#<id>` | `ACTIVITY#<doneAt>#<id>`  | job id and name, outcome, who and when; written and undone with the completion        |
| Request already handled | `HOUSEHOLD#<id>` | `REQUEST#<userId>#<key>`  | the first answer to a done, skip, undo or snooze request, `expiresAt` (TTL, 24 hours) |
| Invite (lookup by code) | `INVITE#<code>`  | `META`                    | home id, invited by, `expiresAt` (TTL, 7 days)                                        |

### 9.5 Endpoints

| Resource   | Endpoints                                                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Me         | `GET /v1/me`, `PATCH /v1/me`, `DELETE /v1/me`, `POST /v1/me/email` (picks up a changed email once Cognito has verified it)                                             |
| Reminders  | `GET/PUT /v1/me/reminders` (saves the settings, then the person's daily and weekly schedules), `POST /v1/me/reminders/test` (202; at most 10 an hour)                  |
| Devices    | `POST /v1/me/push-devices` (a Web Push subscription or an FCM token; 201 with its id), `DELETE /v1/me/push-devices/:deviceId`                                          |
| Homes      | `GET /v1/households`, `POST /v1/households` (with rooms and appliances, creates jobs from the library), `GET/PATCH/DELETE /v1/households/:householdId`, `POST …/leave` |
| Members    | `GET …/members`, `PATCH/DELETE …/members/:userId` (owner only)                                                                                                         |
| Invites    | `POST …/invites`, `GET /v1/invites/:code` (preview), `POST /v1/invites/:code/accept`                                                                                   |
| Rooms      | `GET/POST …/rooms`, `PATCH/DELETE …/rooms/:roomId`                                                                                                                     |
| Jobs       | `GET/POST …/jobs`, `GET/PATCH/DELETE …/jobs/:jobId`                                                                                                                    |
| Doing jobs | `POST …/jobs/:jobId/completions` (done or skipped), `DELETE …/jobs/:jobId/completions/latest` (undo), `POST …/jobs/:jobId/snooze`                                      |
| Agenda     | `GET …/agenda?from=&to=&person=` (built with `buildAgenda`); `GET …/activity?limit=` (latest first)                                                                    |

Passwords never reach our API: sign-up, log in, reset and change go from the app straight to Cognito. Deleting an account asks for the password again, hands over or deletes owned homes, removes memberships, devices and reminder schedules, then the Cognito user. Apple requires in-app account deletion, so this also satisfies App Store review.

**Tests**: supertest for every route with JWT claims injected as API Gateway passes them; DynamoDB Local for repositories, as a service container in CI.

---

## 10. Milestone 4: account and household screens

1. **API client and auth** (#45) and **offline-first data** (#96): Amplify Auth v6 (auth only) inside the static app, a typed client in `lib/api/` parsing with `packages/contracts`, TanStack Query, and the `/` redirect rules.
2. **Signed-out flow**: Welcome, Create account, Email code, Log in, Forgot password, Set a new password, with every error state.
3. **Home flow**: Start or join, Accept an invite (`/join?code=`, from a link or a typed code), Switch home.
4. **Setup**: rooms → appliances → reminder times, creating the home with spread-out first due dates.
5. **Settings**: Your account, Change password, Delete account, Home settings and members (invite with the native share sheet in the apps, Web Share or copy on the web).

Each screen is built for every size in §3 and gets a Playwright spec (happy path plus error cases) with the API mocked, run through the viewport matrix.

---

## 11. Milestone 5: planning screens

Today, This week, Home and Room, Job detail and Add a job, with optimistic updates. On laptops and desktops: Today beside the week strip, and Job detail as a side panel. Haptic feedback on "done" in the apps.

---

## 12. Milestone 6: reminders

1. **Service worker** (web only): offline shell and Web Push. Serwist precaches every exported page and file, so the site opens offline after one visit; a push shows its `{ title, body, url }` as a notification (a garbled one shows a calm default), and tapping it opens that page of the app (Today by default).
2. **Native push** (apps): Capacitor push plugin registers an FCM token; the app asks for permission from a button tap, like the web.
3. **Devices endpoint**: `POST/DELETE /v1/me/push-devices` stores Web Push subscriptions and FCM tokens alike.
4. **Settings screen** and **one EventBridge Scheduler schedule per person** (daily and weekly, in their time zone).
5. **`notify` Lambda**: builds the agenda, skips empty days, sends Web Push (VAPID key from SSM), FCM (service-account key from SSM) and optional SES email; removes devices the push services report as gone. App badge shows the number of late jobs.
6. **SES for Cognito emails** once the sending address is verified.

---

## 13. Milestone 7: polish and art

Commissioned art, empty and error states (offline, something went wrong), accessibility sweep at every size, Lighthouse budgets, and the privacy policy, terms and support pages that both stores require (#97).

---

## 14. Milestone 8: iOS and Android apps (`apps/mobile`)

1. **Capacitor shell** (#98): `apps/mobile` with iOS and Android projects pointed at `apps/web/out`, app id and name, CORS origins, safe areas.
2. **Native features** (#99) in `apps/web/src/lib/native/`: haptics, share sheet, status bar, splash screen, app badge, Android back button, each with a web fallback.
3. **App security** (#100): tokens in the Keychain and Keystore, HTTPS only, WebView locked to our pages, debugging off in release builds.
4. **Builds in CI** (part of #98): an Android debug build and an iOS simulator build in release checks, so native breakage is caught before release.
5. **Deep links** (#101): universal links and app links for `/join`, with the association files served from our domain.
6. **Native push** (#102, with M6).
7. **Store delivery** (#103): on every merge into `production`, fastlane builds a signed AAB and IPA and uploads them to Play internal testing and TestFlight. Signing material lives only in GitHub secrets.
8. **Store listings** (#104): screenshots generated by Playwright at the required device sizes, descriptions, privacy answers, then submission for review.

**Done when** both apps are in the stores and every release reaches testers automatically.

---

## 15. Decisions made in this plan

1. **Native apps with Capacitor**, wrapping the same static web build, rather than a separate React Native app. One UI to build and test, and every screen works the same everywhere. To pass Apple's "more than a website" review rule, the apps use native push, haptics, the share sheet, deep links, an app badge and offline start-up.
2. **Static export** of the web app, so the same files run on Vercel and inside both apps.
3. **Push**: Web Push for browsers, Firebase Cloud Messaging for both apps.
4. **Theme**: softened "with art" palette by default, original Wall chart tokens kept as an alternative. Light only for now.
5. **Sign-in**: email and password through Cognito; emailed codes only to confirm an email or reset a password. No third-party sign-in, so Apple doesn't require "Sign in with Apple".
6. **Shared types** in `packages/contracts`; **agenda on the server** with `packages/schedule`.
7. **Reminders**: one EventBridge Scheduler schedule per person.
8. **Email**: Cognito's built-in sender to start, SES when reminders ship.
9. **No permissions boundary change**: everything fits inside `workload-permissions-boundary`. SES identities, Firebase keys and signing keys are created by hand, once, and stored as secrets.
