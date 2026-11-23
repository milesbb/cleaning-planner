# This week — Claude Context

The screen's notes; the rules for every screen are in `apps/web/CLAUDE.md`.

This week: `weekRange` (the home's week start, moved whole weeks back or forward), `weekTitle` and `buildWeekView` (each day's jobs as done, late or to do, and the week's progress), shown as `DayRow`s with previous and next week; each day says roughly how long its jobs still to do will take ("about 35 min", "about 1 hr 30 min", from the jobs' `effortMinutes`, done jobs left out, in words, never warning colours). Below this week only, Coming up (`ComingUpSection`, `useComingUp`): the four weeks after it from one agenda request (`comingUpRange`, inside `MAX_AGENDA_DAYS`), grouped by week by `buildComingUp`, each job once per week with its day ("Tuesday 1 December"), its weekdays ("Mon, Wed, Fri") or "Every day", linking to Job detail; its own loading, error with Try again, and empty states.
