# Today — Claude Context

The screen's notes; the rules for every screen are in `apps/web/CLAUDE.md`.

Today: `buildTodayView` turns the agenda into Late, Today, Done today and Tomorrow (pure, tested with `today-fixture.ts`); `useToday` loads it for Everyone or Just me (the agenda's `person`); `useJobProgress` ticks and undoes at once (`agenda-changes.ts`), rolls back with the API's message on failure, and sends one idempotency key per tap through the offline queue (`QUEUED_REQUEST_KEY`), so a tap made offline is sent once back online even if the app was closed in between. All done shows the `allDone` art and tomorrow's first job.

Snooze and skip: each due row (`DueJobRow`) is wrapped in `SwipeActions`, so on touch a swipe left uncovers **Snooze a day** and **Skip**; its **More** button opens the same two choices in `JobChoicesSheet` (loaded on first tap through `LazySheet`) for mouse, keyboard and screen readers. `useJobProgress` sends them like ticks: a snooze until tomorrow (`withJobSnoozed`, reusing Week's `withJobMoved`) or a `skipped` completion (`withJobSkipped`, which isn't listed as done), shown at once and put back with the API's message on failure.
