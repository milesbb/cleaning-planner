# Cleaning Planner: Implementation plan

Status: **agreed scope, not started** (2026-11-22). This turns the designs into an ordered list of pull requests. `PLAN.md` explains _why_ (scope, stack, costs); this file explains _what we build, in what order_.

Every item below is one branch → PR into `development` → **PR checks passed**, following the Git workflow in `CLAUDE.md`. Each milestone ends with a release PR into `production`.

The work is tracked as GitHub issues #11–#70, grouped into the milestones **M0 · Foundations** to **M7 · Polish and art**. Each issue lists the tests its PR must add or update and the issues it depends on. Issues labelled `owner action` need the repo owner's admin login or accounts.

---

## 1. What we are building

The designs live in the private design canvas (owner can share it). Two pages matter:

- **Wall chart**: every screen and flow, which sets the layout and behaviour.
- **Wall chart with art**: the same screens with a slightly softer palette, a light paper grain and framed spaces for commissioned illustrations.

We build the **Wall chart with art** version: the layouts and components of Wall chart, with the softened colour tokens and an `ArtFrame` component that shows a plain room icon until the commissioned art arrives. Swapping in the art later is an asset change, not a redesign.

### Screens to build

| Area      | Screen (design name)                       | Route                        |
| --------- | ------------------------------------------ | ---------------------------- |
| Account   | Welcome / log in                           | `/welcome`                   |
| Account   | Create account (name, email, password)     | `/sign-up`                   |
| Account   | Email code (confirms the email at sign-up) | `/verify`                    |
| Account   | Log in (email, password)                   | `/sign-in`                   |
| Account   | Forgot password                            | `/forgot-password`           |
| Account   | Set a new password (code and new password) | `/forgot-password/reset`     |
| Account   | Your account                               | `/settings/account`          |
| Account   | Change password                            | `/settings/account/password` |
| Account   | Delete account                             | `/settings/account/delete`   |
| Household | Start or join a home                       | `/homes/new`                 |
| Household | Accept an invite                           | `/join/[code]`               |
| Household | Home settings and members                  | `/settings/home`             |
| Household | Switch home                                | bottom sheet on every tab    |
| Setup     | Pick rooms (step 1 of 3)                   | `/setup/rooms`               |
| Setup     | Appliances (step 2 of 3)                   | `/setup/appliances`          |
| Setup     | Reminders (step 3 of 3)                    | `/setup/reminders`           |
| Planning  | Today (and the all-done state)             | `/today`                     |
| Planning  | This week                                  | `/week`                      |
| Planning  | Home: rooms                                | `/home`                      |
| Planning  | Room                                       | `/rooms/[roomId]`            |
| Planning  | Job detail                                 | `/jobs/[jobId]`              |
| Planning  | Add a job                                  | `/rooms/[roomId]/add`        |
| Settings  | Settings and reminders                     | `/settings`                  |

`/` redirects to `/welcome` when signed out, `/homes/new` when signed in with no home, otherwise `/today`.

Password screens (Log in, Forgot password, Set a new password, Change password) and the password steps on Create account and Delete account are on the Wall chart page of the canvas.

---

## 2. Milestones at a glance

| #   | Milestone                     | Ends with                                                                          |
| --- | ----------------------------- | ---------------------------------------------------------------------------------- |
| 0   | Finish foundations            | Stack deployed by the pipeline; `/v1/health` live; web on Vercel                   |
| 1   | Design system in code         | Every shared component built, tested and shown on a components page                |
| 2   | Scheduling engine and library | `packages/schedule` answers "what is due, for whom" for every rule                 |
| 3   | Accounts and data API         | Sign up and log in with email and password; homes, rooms, jobs and history via API |
| 4   | Account and household screens | A new person can sign up, start or join a home and finish setup                    |
| 5   | Planning screens              | We use Today, Week, Home and Job detail daily on both phones                       |
| 6   | Reminders                     | Daily and weekly reminders arrive at the chosen time                               |
| 7   | Polish and art                | Commissioned art in, Lighthouse green, first "real" release                        |

Milestones 1 and 2 don't depend on each other and can run side by side. Milestone 3 can start once 2's types are settled.

---

## 3. Milestone 0: finish foundations

Already built: monorepo, CI, release checks, CloudFormation template and pipeline. Still to do, all one-off steps by the repo owner (Claude's AWS role can't deploy):

1. Run the manual **release checks** on `development` and fix anything red.
2. First **release PR** `development → production`.
3. **AWS bootstrap** (README): set the SSM parameter for budget emails, `sam deploy` once with an admin login, approve the GitHub connection in the console.
4. **Vercel**: create the project, add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` to GitHub secrets, set `NEXT_PUBLIC_API_URL` from the stack output, then add the Vercel URL to the stack's `AllowedOrigins`.

**Done when** a merge into `production` deploys both halves without anyone running a command.

---

## 4. Milestone 1: design system in code (`apps/web`)

One PR per bullet. Every component gets a test file with the axe check first, per `CLAUDE.md`.

1. **Tokens and fonts.** Tailwind v4 `@theme` in `globals.css`: ink `#26302c`, paper `#f5f0e3`, card `#fffdf7`, room colours (kitchen, laundry, bathroom, bedroom, living, whole home), status (late, done, danger), person colours, radii, and the hard shadow (`3px 3px 0 ink`) plus the black-button variant (`3px 3px 0 kitchen yellow`). Load Bricolage Grotesque and Atkinson Hyperlegible with `next/font`. Paper grain as one CSS background on the app shell. The original Wall chart palette stays available as a second token set, so switching is a one-file change.
2. **Icons.** One React component per icon in `components/icons/` (the job icons and UI icons from the design system sheet), all 24×24 stroke icons with `aria-hidden`, plus a `JobIcon` that maps a library icon key to its component.
3. **Primitives.** `Button` (primary, secondary, dashed), `IconButton` (label required by the type), `Card`, `Chip`/`Badge`, `Avatar` (initial plus person colour), `SectionHeading`, `TextField`, `PasswordField` (show/hide button, correct `autocomplete` values so password managers fill and save it), `CodeInput` (six digits, paste-friendly).
4. **Choice controls.** `SegmentedControl` (radiogroup, used for frequency and "Everyone / Just me"), `Switch`, `Stepper` (bathroom and bedroom counts). Built on Radix through shadcn so keyboard and screen reader behaviour comes for free, restyled to Wall chart.
5. **Job pieces.** `JobRow` (icon tile, assignee avatar, meta line, done button, late badge, done state with undo), `RoomTile`, `DayRow` for Week.
6. **App shell.** `TabBar` (Today, Week, Home, Settings) at the bottom on phones and as a left rail from `lg:`, `HomeSwitcher` button plus `BottomSheet`, page header pattern.
7. **`ArtFrame`.** Ink-bordered frame with the hard shadow. Takes an art key and alt text; renders the commissioned image when one exists, otherwise a calm room-coloured fill with the room icon. Never renders text over the art.
8. **Components page** at `/dev/components` (excluded from production builds) showing every component in every state, for review on a phone.

**Done when** the components page matches the design system sheet on a phone and a laptop, and every component passes axe.

---

## 5. Milestone 2: scheduling engine and job library (`packages/schedule`)

Pure TypeScript, no I/O. Coverage gate 95%, Stryker mutation score ≥ 85%.

1. **Fixed schedules.** Add `FixedSchedule` (weekdays, or day of month with "last day" handling) next to the existing `FloatingSchedule`, as a `Schedule` union. `nextDueDate` handles both.
2. **Snooze and skip.** A snooze moves the next due date without a completion; a skip is a completion marked `skipped` that advances a floating schedule but isn't shown as "done by".
3. **Due status.** `classifyDue(nextDue, today)` → `late | today | tomorrow | thisWeek | later`, with "this week" honouring the household's `weekStartsOn`. Today is always a `CalendarDate` in the household's timezone, worked out once at the edge.
4. **Who does it.** Assignment is `anyone | member | takeTurns`. `whoseTurn(assignment, completions, members)` rotates through members by who did it last and skips people who have left.
5. **Agenda.** `buildAgenda(jobs, completions, members, range, today)` returns the grouped, sorted list that Today and Week show and that reminders send. Both the API and the `notify` Lambda use this one function.
6. **Spreading.** `spreadFirstDueDates(jobs, startDate)` staggers first due dates at setup, so 9 monthly jobs don't all land on one Saturday.
7. **Job library.** `library/` data, one file per room: id, name, room, icon key, needed appliance (if any), default schedule, recommended range, effort in minutes, how-to steps, why it matters, sources. Seeded from `PLAN.md` §4. Adds "suggest jobs for these rooms and appliances" and the "Most homes do this weekly to fortnightly" text from the range.

**Done when** every rule has tests, including month ends, leap years, DST changes and timezone boundaries.

---

## 6. Milestone 3: accounts and data API (`apps/api`, `infrastructure`)

### 6.1 Infrastructure changes (one PR, before the API work)

- **Cognito user pool**, Essentials tier, sign-in with **email and password**. The email is the username and is confirmed with a six-digit code at sign-up; forgotten passwords are reset with an emailed code.
  - Password policy: at least 12 characters, with no forced symbols, numbers or capitals, so a passphrase or a password manager's suggestion works.
  - One public app client with no secret, allowing only the SRP sign-in flow (the password itself is never sent to Cognito) plus refresh. Refresh tokens last 365 days so phones stay signed in.
  - Cognito temporarily locks sign-in after repeated wrong passwords. Blocking passwords known from data breaches needs the Plus tier (about $0.02 per monthly user); left off for now.
  - Name kept as a standard attribute. Emails come from Cognito's built-in sender at first (about 50 a day, plenty for us) and move to SES in Milestone 6.
- **JWT authorizer** on the HTTP API for every `/v1` route except `/v1/health`.
- **TTL** on the data table (attribute `expiresAt`) for invite codes.
- **Deploy role**: add `cognito-idp:*` and `scheduler:*` to the CloudFormation role in `template.yml`. The `workload-permissions-boundary` already allows both, so **no change is needed in `aws-claude-access`**.
- Outputs for the user pool id and client id, which become `NEXT_PUBLIC_` variables in Vercel.

### 6.2 Shared request and response types

New package **`packages/contracts`**: zod schemas for every request body and response, used by the API to validate input and by the web app's typed client. One definition, checked at both ends.

### 6.3 API structure

```
apps/api/src/
  routes/            one router per resource, wires paths to controllers
  controllers/       parse and validate the request, call a service, shape the response
  services/          business rules (membership, ownership, invites, account deletion)
  data/              DynamoDB repositories, the only code that knows about pk/sk
  middlewares/       authenticated user from JWT claims, household membership, errors
```

`requireMember` and `requireOwner` middlewares load the membership once per request; per `CLAUDE.md`, every route under `/households/:householdId` uses one of them, and each has a test proving a non-member gets 403.

### 6.4 Data design (single table)

| Item                    | pk               | sk                        | Holds                                                      |
| ----------------------- | ---------------- | ------------------------- | ---------------------------------------------------------- |
| Profile                 | `USER#<userId>`  | `PROFILE`                 | name, email, person colour, reminder settings              |
| My homes                | `USER#<userId>`  | `HOUSEHOLD#<householdId>` | home name and my role (for the switcher, one query)        |
| Push subscription       | `USER#<userId>`  | `PUSH#<endpointHash>`     | endpoint, keys, device label                               |
| Home                    | `HOUSEHOLD#<id>` | `META`                    | name, timezone, week start, owner                          |
| Member                  | `HOUSEHOLD#<id>` | `MEMBER#<userId>`         | display name, colour, role                                 |
| Room                    | `HOUSEHOLD#<id>` | `ROOM#<roomId>`           | type, name, order, appliances                              |
| Job                     | `HOUSEHOLD#<id>` | `JOB#<jobId>`             | room, library id, name, icon, schedule, assignment, snooze |
| Completion              | `HOUSEHOLD#<id>` | `DONE#<jobId>#<doneAt>`   | done by, skipped                                           |
| Invite (lookup by code) | `INVITE#<code>`  | `META`                    | home id, invited by, `expiresAt` (TTL, 7 days)             |

"Everything for this home" is one query on `HOUSEHOLD#<id>`. Next due dates are never stored. Membership is written to both the home and the user in one transaction.

### 6.5 Endpoints

| Resource   | Endpoints                                                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Me         | `GET /v1/me`, `PATCH /v1/me`, `DELETE /v1/me`                                                                                                                          |
| Homes      | `GET /v1/households`, `POST /v1/households` (with rooms and appliances, creates jobs from the library), `GET/PATCH/DELETE /v1/households/:householdId`, `POST …/leave` |
| Members    | `GET …/members`, `PATCH/DELETE …/members/:userId` (owner only)                                                                                                         |
| Invites    | `POST …/invites` (new code, old one stops working), `GET /v1/invites/:code` (preview for the join screen), `POST /v1/invites/:code/accept`                             |
| Rooms      | `GET/POST …/rooms`, `PATCH/DELETE …/rooms/:roomId`                                                                                                                     |
| Jobs       | `GET/POST …/jobs`, `GET/PATCH/DELETE …/jobs/:jobId`                                                                                                                    |
| Doing jobs | `POST …/jobs/:jobId/completions` (done or skipped), `DELETE …/jobs/:jobId/completions/latest` (undo), `POST …/jobs/:jobId/snooze`                                      |
| Agenda     | `GET …/agenda?from=&to=&person=` (built with `buildAgenda`)                                                                                                            |

Passwords never reach our API: sign-up, log in, reset and change all go from the web app straight to Cognito.

Deleting an account: the web app first asks for your password again (a fresh Cognito sign-in), then calls `DELETE /v1/me`. If you own a home that has other members, the API asks you to hand it over first (the Delete account screen shows this); a home with no one else is deleted with you. Your memberships, push subscriptions and reminder schedules go, and the Cognito user is removed with `AdminDeleteUser`.

### 6.6 Testing

- supertest for every route, with the JWT claims injected the way API Gateway passes them.
- **DynamoDB Local** for repository tests, as a service container in `core-checks.yml`, so data code is tested against the real query behaviour.

**Done when** the whole flow (sign up, create a home, invite, accept, add a job, complete it, read the agenda) works against the deployed API with a test account.

---

## 7. Milestone 4: account and household screens (`apps/web`)

1. **API client and auth.** Amplify Auth v6 (auth only, not the rest of Amplify) for sign-up, email confirmation, sign-in, password reset and change, and refreshing tokens. A small typed client in `lib/api/` that sends the token and parses responses with `packages/contracts`. TanStack Query for fetching and optimistic updates.
2. **Signed-out flow.** Welcome, Create account, Email code, Log in, Forgot password. Covers: wrong password (one message that doesn't reveal whether the email has an account), too many attempts, password too short, wrong or expired code, "send a new code", "use another email", and someone who signed up but never confirmed their email.
3. **Home flow.** Start or join, Accept an invite (from a shared link or a typed code; expired-code message), Switch home sheet.
4. **Setup.** Pick rooms → appliances → reminder times, then create the home with spread-out first due dates and land on Today.
5. **Account and home settings.** Edit name and email (email change re-verifies with a code), change password, delete account (password required), members list, invite code with copy and share (Web Share API, copy as fallback), rename, leave, delete home.

Every flow gets a Playwright spec (desktop, Android, iPhone) with the API mocked by route interception, plus one real-backend smoke test in the release checks.

---

## 8. Milestone 5: planning screens (`apps/web`)

1. **Today**: Late / Today / Tomorrow, "Everyone / Just me" filter, one-tap done with undo, the all-done state with its art frame.
2. **This week**: day rows with job tiles, done and late states, previous and next week, today highlighted.
3. **Home and Room**: room tiles with job and late counts; a room's jobs with how often, who and next due.
4. **Job detail**: done, snooze, skip; frequency picker with the recommended choice marked, "Custom" for any interval or fixed days; why it matters and how-to steps; who does it (anyone, take turns, a person); last done history; rename and remove.
5. **Add a job**: search the library, filter by room, add with one tap, "Make your own job".

Updates are optimistic: ticking a job moves it straight away and rolls back with a message if the request fails.

**Done when** we've used it for a week on both phones from the Home Screen.

---

## 9. Milestone 6: reminders

1. **Service worker** with Serwist: offline app shell and push handling. Clicking a notification opens Today.
2. **Turning reminders on**: ask for permission only from a button tap; on iPhone, if the app isn't installed, show the "Add to Home Screen first" card instead. Store the subscription with `POST /v1/me/push-subscriptions`.
3. **Settings screen**: daily nudge time, week-ahead day and time, only my jobs, also by email, send a test reminder.
4. **One schedule per person.** When someone saves reminder times, the API creates or updates their own **EventBridge Scheduler** schedules (daily and weekly) with their timezone, so DST is handled by AWS. Schedules are named `cleaning-planner-<userId>-daily` / `-weekly` so they stay inside the permissions boundary.
5. **`notify` Lambda**: loads that person's homes, builds the agenda, skips empty days, sends Web Push with the `web-push` library (VAPID private key read from SSM) and, if chosen, an SES email. Removes subscriptions the push service says are gone.
6. **Infrastructure**: `NotifyFunction`, a Scheduler role that can only invoke it, a schedule group, and permissions for the API to manage schedules.

One-off owner steps: generate VAPID keys (private key into SSM as a SecureString under `/cleaning-planner/`, public key into Vercel), verify a sending address or domain in SES and, if needed, request production access. Then point Cognito's emails at SES too.

**Done when** reminders arrive at the chosen time on an Android phone and on an iPhone running the installed app.

---

## 10. Milestone 7: polish and art

- Commissioned art (brief on the design canvas): exported at 1×, 2× and 3×, served with `next/image`, wired into `ArtFrame` by key. Room scenes replace the room icons in setup and on Home.
- App icon and splash screens from the house-and-tick mark.
- Lighthouse budgets green, keyboard and screen reader pass on every screen, empty and error states (no internet, something went wrong).
- Release, then update `README.md` and `PLAN.md` status.

Later, from `PLAN.md`: calendar feed, dark mode, stats, store builds with Capacitor.

---

## 11. Decisions made in this plan

These are my recommendations. Each can be changed before its milestone starts.

1. **Theme**: softened "with art" palette by default, original Wall chart tokens kept as an alternative.
2. **Sign-in** (decided 2026-11-22): email and password through Cognito, with emailed codes only for confirming the email and resetting a forgotten password. Passkeys could be added later as an extra way in.
3. **Shared types**: new `packages/contracts` with zod schemas, used by both API and web.
4. **Agenda on the server**: `GET …/agenda` uses `packages/schedule`; the web app uses the same package only for optimistic updates.
5. **Reminders**: one EventBridge Scheduler schedule per person instead of a 15-minute sweep. It's free at our size, exact to the minute and handles timezones and DST.
6. **Email**: Cognito's built-in sender to start, SES when reminders ship.
7. **No permissions boundary change**: everything here fits inside `workload-permissions-boundary`. SES identities are verified by hand once rather than in the template, which keeps it that way.
