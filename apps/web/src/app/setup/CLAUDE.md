# Setup — Claude Context

The screen's notes; the rules for every screen are in `apps/web/CLAUDE.md`.

The three setup steps (`/setup/rooms`, `/setup/appliances`, `/setup/reminders`) in `SetupScreen`. Create home posts once and never retries on its own (no idempotency key on create), then opens `/setup/done`: "You’re all set", the `AppGuide` (`components/guide/`, the same one Help shows) and Go to Today.

Each step asks a signed-out visitor to log in first (`SignInFirst`, since nothing on these screens calls the API until Create home). `/setup/done` shows only in the tab that has just created a home (`lib/setup/just-created-home.ts`); opened any other time it sends you to Today.
