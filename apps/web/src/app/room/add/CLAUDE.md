# Add a job — Claude Context

The screen's notes; the rules for every screen are in `apps/web/CLAUDE.md`.

Add a job (`/room/add?id=`, from Add a job on Room): search the library (`lib/jobs/library-search.ts`: every word in the name or what the job says, name matches first) for this room or all rooms, one tap adds a job with its usual timing for anyone (no automatic retry), jobs already in the room show Added, and Make your own job adds a repeat-after-done job and opens it on Job detail. The library loads after the screen (`useJobLibrary`), keeping it out of the first load. Make your own job's sheet loads on first tap (`MakeYourOwnJob`, `LazySheet`).
