# Today — Claude Context

The screen's notes; the rules for every screen are in `apps/web/CLAUDE.md`.

Today: `buildTodayView` turns the agenda into Late, Today, Done today and Tomorrow (pure, tested with `today-fixture.ts`); `useToday` loads it for Everyone or Just me (the agenda's `person`); `useJobProgress` ticks and undoes at once (`agenda-changes.ts`), rolls back with the API's message on failure, and sends one idempotency key per tap through the offline queue (`QUEUED_REQUEST_KEY`), so a tap made offline is sent once back online even if the app was closed in between. All done shows the `allDone` art and tomorrow's first job.
