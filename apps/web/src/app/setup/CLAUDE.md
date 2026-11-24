# Setup — Claude Context

The screen's notes; the rules for every screen are in `apps/web/CLAUDE.md`.

The three setup steps (`/setup/rooms`, `/setup/appliances`, `/setup/reminders`) in `SetupScreen`. Create home posts once and never retries on its own (no idempotency key on create), then opens `/setup/done`: "You’re all set", the `AppGuide` (`components/guide/`, the same one Help shows) and Go to Today.
