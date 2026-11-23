# Work board — Claude Context

## README

`README.md` at the repo root is the developer setup guide. If your changes affect anything it documents, update it to match.

`npm run work:board` (from the repo root): reads the open GitHub issues with `gh` and shows what's in flight, what can start now, what would clash and what's blocked, and claims issues for parallel sessions. How sessions use it is in `docs/PARALLEL-WORK.md`; change that guide whenever the rules here change.

## Key files

| File                | Purpose                                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/issues.ts`     | `Issue`, the label names (`STATUS`, `owner action`, `later`, `lane: everything`), and reading lanes, size and the `Depends on` line from an issue. |
| `src/board.ts`      | `buildBoard`: places every open issue (in flight, start now, waiting for a lane, blocked, needs a decision, owner, later) and lists problems.      |
| `src/claim.ts`      | `reasonNotToClaim`: why an issue can't be claimed right now, in words.                                                                             |
| `src/label-sync.ts` | `labelChangesFor`: which `status: ready` / `status: blocked` labels to add or remove so GitHub matches the board.                                  |
| `src/board-text.ts` | `boardText`: the printed board.                                                                                                                    |
| `src/github.ts`     | The only file that talks to GitHub (`gh issue list/edit/comment`, arguments passed as an array, never through a shell). Not unit tested.           |
| `src/cli.ts`        | Commands: show, `--sync-labels`, `claim`, `review`, `unclaim`. Not unit tested; keep logic out of it.                                              |

## Rules

- Everything that decides something is a pure function over `Issue[]`, tested with `src/test-issues.ts`.
- An issue with no lane counts as `lane: everything`; two in-flight issues in one lane is a problem the board prints, never something it hides.
- A dependency that isn't in the open list counts as done (merged or closed).
