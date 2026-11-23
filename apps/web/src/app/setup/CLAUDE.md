# Setup — Claude Context

The screen's notes; the rules for every screen are in `apps/web/CLAUDE.md`.

The three setup steps (`/setup/rooms`, `/setup/appliances`, `/setup/reminders`) in `SetupScreen`. Create home posts once and never retries on its own (no idempotency key on create), then opens `/today`.

From 1024px the rooms and appliances steps take `SetupScreen layout="choices"` (48rem, choices in two columns, `ChoicesContinueButton` 20rem wide); Reminders stays a 32rem form (`docs/LAYOUTS.md` §4.2). Layout checks: `e2e/setup-layout.spec.ts`.
