# Schedule package — Claude Context

## README

`README.md` at the repo root is the developer setup guide. If your changes affect anything it documents, update it to match.

Pure TypeScript scheduling engine shared by the web app and the `notify` Lambda. It answers "when is this task next due?" and, later, "what's due today / this week?". It has **no runtime dependencies, no I/O, and no knowledge of AWS or React**.

## Key files

| File                    | Purpose                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `src/types.ts`          | Schedule rule types: `Schedule` = `FloatingSchedule` \| `FixedSchedule`, `Interval`, `Weekday`. |
| `src/calendar-date.ts`  | `CalendarDate` branded `YYYY-MM-DD` type, parsing, `addInterval`, month and weekday helpers.    |
| `src/fixed-schedule.ts` | `firstFixedOccurrence(rule, from)` for weekdays and day-of-month rules.                         |
| `src/next-due.ts`       | `nextDueDate(schedule, history)` for both schedule types, honouring a snooze.                   |
| `src/snooze.ts`         | `createSnooze` validates a snooze and records the due date it moves.                            |
| `src/completions.ts`    | `lastCompletedOn` (done or skipped) and `lastDone` (real completions only).                     |
| `src/due-status.ts`     | `classifyDue` (late, today, tomorrow, this week, later) and `lastDayOfWeek`.                    |
| `src/time-zone.ts`      | `calendarDateInTimeZone(instant, timeZone)`: the one place an instant becomes a home's day.     |

## Rules

- **Work in calendar dates (`CalendarDate`), not `Date` objects or timestamps.** Cleaning tasks are due on a day, not at an instant. The only conversion is `calendarDateInTimeZone` in `time-zone.ts`, which the edges (API, Lambdas, web app) call once to get "today" for a home; nothing else in here touches instants or time zones.
- "This week" runs to the end of the home's week (`weekStartsOn`); tomorrow is always "tomorrow", even when it starts the next week.
- Create `CalendarDate` values only through `parseCalendarDate` / `isCalendarDate`. Never cast a string to `CalendarDate`.
- Month arithmetic clamps to the last day of shorter months (31 Jan + 1 month = 28/29 Feb).
- Floating schedules are measured from the **last completion**; never from the original start date once the task has been done.
- Fixed schedules are due on the first matching day (weekday, day of month or last day) **after** the last completion, or on or after the start date if never done. A day of the month past a month's end falls on that month's last day.
- A skip is a completion with outcome `skipped`: it moves the schedule on (`lastCompletedOn`) but never counts as "done by" anyone (`lastDone`).
- A snooze remembers the due date it moved (`from`). It only applies while the schedule still says that date, so doing or skipping the job ends it with no clean-up.
- Import from the specific file (`@cleaning-planner/schedule/next-due`). There is no index barrel.

## Test-driven development — non-negotiable rules

1. Write a failing test that specifies the expected behaviour.
2. Write the minimum code to make it pass.
3. Refactor — keep the test green.

## Tests

- Vitest. Tests sit next to the source (`next-due.ts` → `next-due.test.ts`).
- Coverage thresholds are **95%** for lines, branches, functions and statements, enforced in CI. This package must never be wrong.
- Every new rule needs cases for month ends, leap years, year boundaries and DST weekends.
- Use `it.each` tables for date edge cases.

## Types

- Explicit return types on every function (enforced by ESLint).
- No `any`, no type assertions (`assertionStyle: never` is enforced), `interface` for object shapes.
