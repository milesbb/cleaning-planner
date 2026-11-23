# Room — Claude Context

The screen's notes; the rules for every screen are in `apps/web/CLAUDE.md`.

Room (`/room?id=`): the room's jobs soonest first with how often, who and next due, from `lib/home/room-jobs.ts` (`summariseRooms`, `jobsInRoom`) and `useRoomSources` (rooms, jobs, `GET …/progress`, people). **Edit room** (header, `EditRoomSheet`): rename (`RoomNameForm`, keyed by the room's version; sends only a changed name with the version it read, no automatic retry; a version conflict offers Reload, which refreshes the home and starts again from the saved name) and **Remove room** in the same sheet, which asks first with how many jobs go with it (`removalWarning`), then goes back to Home. The mutations are in `use-room-actions.ts`.
