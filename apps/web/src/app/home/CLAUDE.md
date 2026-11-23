# Home — Claude Context

The screen's notes; the rules for every screen are in `apps/web/CLAUDE.md`.

Home: a `RoomTile` per room with its job and late counts, and Add a room (a sheet; no automatic retry). **Reorder rooms** (two or more rooms) swaps the tiles for `ReorderRooms`: a list with Move up / Move down per room (`aria-disabled` at the ends and while saving, so focus stays put; a status line says where the room is now) and Done. A move shows at once, then `useReorderRooms` saves the rooms whose place changed (`room-order.ts`: order = place in the list) with their versions, no automatic retry, and reads the home again either way, so a failed save puts the list back with a message.
