# Working on issues in parallel

Several Claude Code sessions can build the website at once, each on its own issue, in its own git worktree, on its own branch, with its own PR into `development`. This guide is how they stay out of each other's way. **Every session reads it before touching an issue.**

## The board

```sh
npm run work:board
```

It reads the open GitHub issues and prints:

| Section                                    | Meaning                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| IN FLIGHT                                  | Claimed by a session (`status: in progress`) or with a PR open (`status: in review`) |
| START NOW                                  | Nothing it depends on is open, and none of its lanes are held. Pick from here only.  |
| READY, BUT WOULD CLASH WITH WORK IN FLIGHT | Could start, but shares a lane with something in flight. Names the holder.           |
| BLOCKED                                    | An issue on its **Depends on** line is still open.                                   |
| NEEDS A DECISION FROM THE OWNER            | `status: needs decision`: the issue says what has to be decided.                     |
| WAITING ON THE OWNER                       | `owner action`: accounts, keys, money, art.                                          |
| LATER                                      | `later`: after the MVP.                                                              |
| PROBLEMS                                   | Missing lane labels, or two in-flight issues in one lane.                            |

The board is the source of truth. The `status: ready` and `status: blocked` labels are only a copy for GitHub's own lists: `npm run work:board -- --sync-labels` brings them up to date.

## Series and parallel

- **Series** is written on the issue: its `**Depends on:** #x, #y` line. An issue is blocked until every issue on that line is closed (merged).
- **Parallel** is decided by **lanes**. A lane is a set of files. At most one in-flight issue may hold a lane, so two issues run side by side only when they share no lane. An issue holds its lanes from the moment it's claimed until its PR merges.
- An issue with no lane label is treated as `lane: everything`, which runs alone.

## Lanes

| Lane                | Files it owns                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lane: account`     | Signed-out screens: `apps/web/src/app/{welcome,sign-in,sign-up,verify,forgot-password}`, `src/components/account`, `src/lib/auth`                                                                 |
| `lane: setup`       | `src/app/{setup,homes,join}`, `src/lib/setup`, `src/lib/invites`                                                                                                                                  |
| `lane: today-week`  | `src/app/{today,week}`                                                                                                                                                                            |
| `lane: home-room`   | `src/app/{home,room}` (Add a job included), `src/lib/jobs`                                                                                                                                        |
| `lane: job`         | `src/app/job`, and the job helpers in `src/lib/home` (`job-*`, `schedule-draft`, `assignee-choices`, `library-advice`, `use-library-advice`)                                                      |
| `lane: settings`    | `src/app/settings`                                                                                                                                                                                |
| `lane: shell`       | `src/components/{shell,app,start}`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/lib/navigation`                                                                                                |
| `lane: ui-kit`      | `src/components/{ui,icons,art,jobs}`, `src/app/globals.css`, `src/lib/design-tokens.ts`, `src/app/dev`                                                                                            |
| `lane: data-layer`  | `src/lib/api`, `src/lib/storage`, and the rest of `src/lib/home` (`home-queries`, `current-home`, `room-jobs`…)                                                                                   |
| `lane: pwa`         | The service worker, `src/app/manifest.ts`, `apps/web/public`                                                                                                                                      |
| `lane: legal-pages` | `src/app/{privacy,terms,support}`                                                                                                                                                                 |
| `lane: api`         | `apps/api`, `packages/contracts`                                                                                                                                                                  |
| `lane: schedule`    | `packages/schedule`                                                                                                                                                                               |
| `lane: infra`       | `infrastructure`, `packages/infrastructure-rules`                                                                                                                                                 |
| `lane: ci`          | `.github`, root config (`package.json` scripts, `turbo.json`, `eslint.shared.mjs`, `knip.json`, `tsconfig.base.json`), `apps/web/playwright.config.ts`, `apps/web/scripts`, `packages/work-board` |
| `lane: mobile`      | `apps/mobile`, `src/lib/native`                                                                                                                                                                   |
| `lane: design`      | Design canvas work and the docs that record it                                                                                                                                                    |
| `lane: everything`  | Touches files across the repo: runs only when nothing else is in flight                                                                                                                           |

Paths under `src/` are in `apps/web`.

### Shared files

Some files collect a line from almost every feature. Any lane may make **small, additive** edits to them; on a conflict, rebase onto `development` and keep both sides:

- `README.md`, `docs/IMPLEMENTATION.md`, and the shared `CLAUDE.md` files (a row or a sentence each). A screen's own notes go in the `CLAUDE.md` in its folder (`apps/web/src/app/today/CLAUDE.md`, …), which belongs to that screen's lane, not in `apps/web/CLAUDE.md`
- `apps/web/e2e/support/fake-home.ts`: one line adding your new `fake-<resource>.ts` to `fakeHome`. Each screen has its own `e2e/<screen>.viewports.spec.ts`, so a new screen adds a file rather than editing a shared spec
- the `/dev/components` demo list, when adding a component in your lane
- the route list in `apps/api/src/app.ts` and `apps/api/src/composition.ts`
- `package-lock.json`: after a rebase, run `npm install` rather than editing it by hand

Anything bigger than a few lines in someone else's lane means you need that lane.

## Starting sessions (the coordinator)

One session coordinates: usually the one the owner talks to. It's the only one that claims issues for others, merges releases and changes this system.

1. `npm run work:board -- --sync-labels` to see what can start.
2. Pick issues from START NOW. Claim them one at a time: each claim takes its lanes, so the next claim fails if it would clash.
   ```sh
   npm run work:board -- claim 97 "session legal-pages" feature/97-legal-pages
   ```
3. Start one session per claimed issue, each with its own worktree, using the brief below.
4. When a session reports its PR merged: run `--sync-labels` (newly unblocked issues move to START NOW) and start the next one.
5. Release when a batch has landed: the coordinator alone opens `development` → `production`, following the root `CLAUDE.md`.

**Brief for a new session** (fill in the issue):

> Work on issue #97 (Privacy policy, terms and support pages) in milesbb/cleaning-planner. It is already claimed for you on branch `feature/97-legal-pages`; your lanes are `legal-pages`. Read `docs/PARALLEL-WORK.md` and the `CLAUDE.md` files first, follow the worker steps, and stay inside your lanes. Finish when the PR is merged into `development`, then reply with the PR link.

The owner can also open a session themselves and say "pick up the next issue": that session follows the worker steps from step 1.

## Worker steps (every other session)

1. **Claim.** If your issue isn't already claimed for you, run `npm run work:board`, pick one from START NOW, and claim it with your session name and branch. If the claim fails, pick another; never work on an issue that isn't `in progress` for you.
2. **Set up.** In your worktree: `git fetch origin && git switch -c feature/<issue>-<slug> origin/development`, then `npm ci`.
3. **Build** it the usual way (root `CLAUDE.md`: TDD, readability, security). Stay inside your lanes and the shared-file rules.
   - Need another lane? If the board shows it free, add it (`gh issue edit <issue> --add-label "lane: <name>"`) and run the board again to check nothing clashes. If it's held, don't touch those files: comment on your issue what you need and stop, so the coordinator can decide.
4. **Check** before pushing: `npm run format:check && npm run lint && npm run typecheck && npm test`, plus your e2e specs.
   - Run e2e on a port of your own, so sessions don't share a server: `E2E_PORT` set to 3100 plus your issue number (`E2E_PORT=3280` for #180), with `CI=1` so Playwright starts its own server instead of reusing whatever answers on that port.
5. **PR** into `development` with `Closes #<issue>` in the body, then `npm run work:board -- review <issue>`.
6. **Merge** when PR checks pass: rebase onto `development` first if it moved, squash-merge, author email `10620446+milesbb@users.noreply.github.com`.
   - Wait for checks with `gh pr checks <pr> --watch` run in the background (it ends when they do), not a polling loop. Every check must pass, Vercel included (it reports `state`, not `conclusion`).
   - If Vercel fails only because of its daily build limit, leave the PR in review and work on another issue; when the limit resets, push an empty commit to rebuild it.
7. **Hand back.** `npm run work:board -- --sync-labels`.
8. **Keep going.** Claim the next issue from START NOW and go back to step 2, without asking. Prefer issues that unblock others. Only when START NOW has nothing you can claim: notify the owner (a push notification if you have the tool) and end your turn with the PRs you merged, asking what to work on next.

**Found something outside your issue?** Don't fix it in your PR. Open a new issue as described in [Writing new issues](#writing-new-issues), then carry on.

**Needs the owner?** If an issue turns out to need a decision, an account, a key or money: comment on it saying exactly what's needed, add `status: needs decision`, `unclaim` it and move on to another issue.

**Never:** open a release PR or touch `production`; push to another session's branch; claim a second issue before your first is merged (except while one waits on Vercel's build limit); work on an issue in BLOCKED, NEEDS A DECISION or LATER; weaken a rule in `CLAUDE.md` to get a check passing; stop to ask whether to continue.

If you stop without finishing, give the issue back: `npm run work:board -- unclaim <issue>`, and say on the issue how far you got.

## Writing new issues

Every issue (except `owner action`) gets:

- a **lane** label for each lane it changes (`lane: everything` if it really touches everything)
- a **size**: `size: S` (a few hours), `size: M` (a day), `size: L` (several days: consider splitting)
- a `**Depends on:**` line naming the issues that must merge first, or `nothing`
- `status: needs decision` if the owner must choose something first, with the choices written in the issue; `later` if it's after the MVP

Prefer issues that fit one lane: they run in parallel with the most other work.
