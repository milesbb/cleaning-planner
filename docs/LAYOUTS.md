# Tablet and desktop layouts

The agreed layouts for the main screens at **640px, 1024px and 1440px** wide (#92), written as a spec instead of canvas designs. Phones (320–639px) stay as they are built today; this spec layers the larger sizes on top, mobile-first, with Tailwind's `sm:`, `md:`, `lg:` and `xl:` prefixes.

It builds on what the code does now (`AppShell`, `TabBar`, `BottomSheet`, `AccountScreen`, the Wall chart tokens in `globals.css`) and on the plan (`docs/IMPLEMENTATION.md` §3: Today beside the week strip and Job detail as a side panel on laptops). The issues that build it are listed in [§5](#5-who-builds-what). Questions that need the owner's taste are in [§7](#7-open-questions); until answered, build what this spec says.

## Contents

1. [Sizes and breakpoints](#1-sizes-and-breakpoints)
2. [The frame](#2-the-frame): navigation, content widths, spacing, the two-column frame, sheets
3. [Job detail as a side panel](#3-job-detail-as-a-side-panel)
4. [Screens](#4-screens): [Welcome](#41-welcome-and-the-other-signed-out-screens), [Setup](#42-setup-steps-and-start-or-join), [Today](#43-today), [Week](#44-week), [Home](#45-home), [Room](#46-room), [Job detail](#47-job-detail-page), [Add a job](#48-add-a-job), [Settings](#49-settings)
5. [Who builds what](#5-who-builds-what)
6. [Tests](#6-tests)
7. [Open questions](#7-open-questions)

---

## 1. Sizes and breakpoints

No custom breakpoints: the three sizes map onto Tailwind's defaults. 1440px uses the `xl:` rules (from 1280px); the content caps do the rest.

| Width    | Prefix | Navigation      | Signed-in content area                   | Typical device                |
| -------- | ------ | --------------- | ---------------------------------------- | ----------------------------- |
| 320–639  | none   | Bottom tab bar  | Viewport − 32px (`px-4`)                 | Phones                        |
| **640**  | `sm:`  | Bottom tab bar  | 640 − 48 = **592px** (`sm:px-6`)         | Large phones in landscape     |
| 768      | `md:`  | Bottom tab bar  | 768 − 48 = 720px                         | Tablets in portrait           |
| **1024** | `lg:`  | Left rail 240px | 1024 − 240 − 80 = **704px** (`lg:px-10`) | Laptops, tablets in landscape |
| 1280     | `xl:`  | Left rail 240px | 1280 − 240 − 80 = 960px                  | Laptops                       |
| **1440** | `xl:`  | Left rail 240px | 1440 − 240 − 80 = **1120px**             | Desktops                      |
| 1920     | `xl:`  | Left rail 240px | capped at 80rem (1280px), centred        | Large desktops                |

Rules at every size (root `CLAUDE.md`): touch targets at least 44×44px, nothing hover-only, everything reachable by keyboard with a visible focus outline (`outline-3 outline-ink`), animate only transform and opacity and respect reduced motion, reserve space so nothing jumps, and no sideways scroll from 320 to 1920px.

---

## 2. The frame

### 2.1 Navigation

Unchanged from `TabBar` today:

- **Below 1024px**: the bottom tab bar (four tabs, 56px tall targets, safe areas). The page keeps `pb-[calc(6.5rem+env(safe-area-inset-bottom))]` so the last row is never hidden behind it.
- **From 1024px**: a left rail, 240px wide (`lg:w-60`), sticky and full height, with the app mark and name at the top and the four tabs stacked as icon + label rows. The active tab keeps its `bg-kitchen` fill and ink border.
- The rail and the tab bar are the same `<nav aria-label="Main">`; only one is ever visible. Signed-out screens (Welcome, Log in, the setup steps) have neither.

### 2.2 Content widths

Every screen uses one of three widths. Nothing ever stretches edge to edge on a desktop.

| Width      | Max width                                           | Used by                                                                                       | Where it comes from                                               |
| ---------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Form**   | 28rem (`max-w-md`), 32rem from 1024px               | Welcome on phones, Log in, Create account, Email code, passwords, setup on phones and 640px   | `AccountScreen` (exists)                                          |
| **Column** | 48rem (`max-w-3xl`)                                 | Week below 1024px, Home below 1024px, Room below 1024px, Add a job, Job detail page, Settings | `AppShell` (exists; the default)                                  |
| **Split**  | 48rem below 1024px, 80rem (`max-w-7xl`) from 1024px | Today, Week, Home and Room from 1024px                                                        | `AppShell layout="split"` (new, [§2.4](#24-the-two-column-frame)) |

Forms inside a Column-width screen (Change password, Change email, Delete account, Home details) keep their fields to **32rem** (`max-w-lg`) and sit at the start of the column, so a password field is never 48rem wide.

### 2.3 Spacing

Keep the spacing the shell already uses; the larger sizes only add room between columns.

| Space                           | Phone            | 640px             | 1024px            | 1440px             |
| ------------------------------- | ---------------- | ----------------- | ----------------- | ------------------ |
| Page side padding               | 16px (`px-4`)    | 24px (`sm:px-6`)  | 40px (`lg:px-10`) | 40px               |
| Page top padding                | 16px (`pt-4`)    | 16px              | 32px (`lg:pt-8`)  | 32px               |
| Between blocks in a column      | 16px (`gap-4`)   | 16px              | 16px              | 16px               |
| Between sections inside a block | 24px (`gap-6`)   | 24px              | 24px              | 24px               |
| Between the two columns         | n/a              | n/a               | 24px (`lg:gap-6`) | 40px (`xl:gap-10`) |
| Between tiles in a grid         | 12px (`gap-3`)   | 16px (`sm:gap-4`) | 16px              | 16px               |
| Between job rows                | 10px (`gap-2.5`) | 10px              | 10px              | 10px               |

### 2.4 The two-column frame

Today, Week, Home and Room use the same frame from 1024px: the page header across the top, then a **main column** and a **side column**.

```text
1024px                                       1440px
+--------+---------------------------------+ +--------+--------------------------------------------+
| rail   | header (spans both columns)     | | rail   | header (spans both columns)                |
| 240px  +------------------+--------------+ | 240px  +----------------------------+---------------+
|        | main column      | side column  | |        | main column                | side column   |
|        | 360px (1fr)      | 320px (20rem)| |        | 696px (1fr)                | 384px (24rem) |
|        |                  | sticky       | |        |                            | sticky        |
+--------+------------------+--------------+ +--------+----------------------------+---------------+
```

Page padding 40px on each side at both widths; 24px between the columns at 1024px, 40px at 1440px.

- **Grid**: `lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-10`, inside `AppShell`'s content area at 80rem max. The main column holds the screen's list; the side column holds the screen's side content, or Job detail when a job is open ([§3](#3-job-detail-as-a-side-panel)).
- **Why these numbers**: 20rem at 1024px leaves the main column 360px, wider than the 288px a 320px phone gives the same job rows, so every row component works unchanged. The side column at 20rem (with 20px padding inside a panel) also matches a 320px phone, which is what Job detail is designed for.
- **Side column is sticky**: `lg:sticky lg:top-8 lg:self-start lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto`, so the week strip or a job's details stay in view while the list scrolls. It scrolls on its own when taller than the window.
- **Order**: the main column comes first in the DOM and in tab order, the side column second. Each column is a landmark-friendly `<section>` with a heading (the side column's heading may be visually small, but it exists).
- **Below 1024px** each screen says what happens to its side content: **stacked** under the main column (Home's Recently), or **not shown** (Today's week strip, the Week and Room hint). Not shown means not rendered at all (a JavaScript media query, `useIsLaptop`), not just hidden with CSS, so phones don't fetch data they never show.
- **Built as** a `TwoColumns` component in `src/components/shell` (`main`, `side`, `sideLabel`, `sideBelowLaptop: 'stacked' | 'hidden'`) and `AppShell`'s `layout="split"`. Every `TwoColumns` opens job links from its main column on a laptop (#200), so there is no `opensJobs` switch: Home's main column has no job links.

### 2.5 Sheets and dialogs

`BottomSheet` stays as it is: a bottom sheet on phones (rounded top, up to 85% of the height, scrolls inside) and **a centred dialog from 640px**, `min(32rem, 100vw − 2rem)` wide, with the hard shadow, a backdrop of `ink/40`, focus trapped, Escape and the backdrop close it, and focus goes back to the button that opened it.

- **Wide sheets**: a new `size="wide"` gives `min(40rem, 100vw − 2rem)` from 768px (`md:`), for sheets whose content is a grid of choices:
  - Add a room (room types in three columns from 768px),
  - Edit room (the appliance ticks in two columns from 768px),
  - See all activity (long lines read better wider).

  Every other sheet (snooze, done earlier, Move to…, schedule, assignee, rename, remove, profile, home details, Your homes, manage member, leave, delete) stays 32rem: they are short forms.

- Dialogs never become side panels. The only side panel is Job detail ([§3](#3-job-detail-as-a-side-panel)), and a sheet opened from inside it (Snooze, Change how often…) is still a centred dialog over everything.
- Phones in landscape (640px or more wide but under 500px tall) get the centred dialog too; its 85dvh max height and inner scroll keep the buttons reachable.

---

## 3. Job detail as a side panel

From 1024px, opening a job from **Today, Week or Room** shows Job detail in the side column instead of leaving the list. Below 1024px, and when a job link is opened in a new tab or from outside the app, it is the full Job detail page as now.

```text
1024px, Today with a job open
+--------+-------------------------------------------------------+
| [mark] | [Home switcher]                                       |
| Name   | Today                                                 |
|        | Tuesday 24 November · about 40 min                    |
| >Today<+---------------------------+---------------------------+
|  Week  | [ Everyone | Just me ]    | Clean the oven        [X] |
|  Home  |                           | Kitchen                   |
|  Sett. | LATE                      | +-----------------------+ |
|        | +-----------------------+ | | Due today             | |
|        | |[ic] Wipe benches   [ ]| | | [   Mark as done    ] | |
|        | +-----------------------+ | | [Skip] [Snooze]       | |
|        | TODAY                     | | Done on another day…  | |
|        | +=======================+ | +-----------------------+ |
|        | |[ic] Clean the oven  [ ]| | How often                 |
|        | +=======================+ | Every 3 months ·Change    |
|        | +-----------------------+ | Who does it               |
|        | |[ic] Vacuum lounge   [ ]| | Anyone · Change           |
|        | +-----------------------+ | Why / How to / History    |
|        | DONE TODAY ...            | [Rename]   [Remove]       |
+--------+---------------------------+---------------------------+
          main column 360px           side column 320px (scrolls)
          the open row is marked      replaces the week strip
```

**Address.** The list page's own address gains `job=<id>`: `/today?job=abc`, `/week?job=abc`, `/room?id=r1&job=abc`. Back closes the panel, Forward reopens it, and the address can be copied. It is not `/job?id=` because a static export can't show one route inside another (Next.js's intercepting routes need a server and aren't supported by `output: 'export'`), and swapping the address under a mounted page with `history.pushState` makes Back and reload behave differently. The plain `href` on every job row stays `/job?id=…`, so the link works without JavaScript, on phones, and in a new tab.

**Opening.**

- At 1024px or wider, a plain click or tap (or Enter on the focused link) on a job link in a `TwoColumns` main column is caught and adds `job=<id>` to the address with the browser's own `history.pushState`, which Next.js keeps its router in step with (`useOpenJob`, `lib/navigation/address-record-id.ts`). A click with Ctrl, Cmd, Shift or the middle button is left alone, so "open in a new tab" still gives the full page.
- Opening a second job while one is open **replaces** the address (`router.replace`), so Back closes the panel instead of stepping through every job looked at.
- If the window is narrowed below 1024px while a job is open, the page replaces its address with `/job?id=<id>` and shows the full page. If an address with `job=` is opened on a phone, the same happens.

**Inside the panel.** The same sections as the Job detail page, in one column, in this order: the header (job name as an `h2`, room name under it, Close button, a 48px `IconButton` with the label "Close"), the due card (when it's due, Mark as done, Skip, Snooze, Done on another day…), How often, Who does it, How long it takes, Room, Why, How to, History, then Rename and Remove. The progress buttons stack (`lg:grid-cols-1`, as the page does at this width). The panel is `rounded-card border-2 border-ink bg-paper p-5` with no shadow, so it reads as part of the page, not a floating dialog.

**Closing and focus.**

- Close, Escape (while focus is in the panel and no sheet is open) and Back all close it. Close and Escape go back in history if the panel was opened from this list, otherwise replace the address without `job=`.
- On opening, focus moves to the panel's heading (`tabIndex={-1}`), and a screen reader hears the job's name. On closing, focus goes back to the job's row link, or to the page heading if that row has gone (the job was done and left the list, or removed).
- The panel is **not modal**: no focus trap, no backdrop; the list stays usable. Tab order runs from the list into the panel.
- The open job's row is marked: `aria-current="true"` on its link and a thicker look (`border-3`, `bg-whole-home`), never colour alone. Not built yet: #293.

**Changes made in the panel.** Done, Skip and Snooze update the list beside it at once (the same query cache), and the panel stays open showing the new due date. Remove closes the panel and returns focus to the page heading. A job that no longer exists shows "This job isn't here any more" with a Close button instead of the sections.

**Side content.** While no job is open, the side column shows the screen's own side content: the week strip on Today, a hint on Week and Room ([§4.4](#44-week), [§4.6](#46-room)). The column keeps its width either way, so opening a job never moves the list. The panel appears with the existing `animate-fade-in` (opacity only), or instantly with reduced motion.

---

## 4. Screens

Each screen: phones as now, then 640px, 1024px and 1440px. "As now" means the code on `development` when this spec merged.

### 4.1 Welcome and the other signed-out screens

`/welcome`; the same frame for `/sign-up`, `/verify`, `/sign-in`, `/forgot-password` and `/forgot-password/reset`. No navigation.

| Width  | Layout                                                                                                                                                                                                                                                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Phone  | As now: one column (`AccountScreen`, 28rem), app name, welcome art, heading and line, the two buttons pinned to the bottom of the screen.                                                                                                                                                                                      |
| 640px  | One centred column, 28rem, 48px from the top (`sm:pt-12`). The buttons **follow the text** with 32px between instead of being pushed to the bottom: on a tall screen, buttons at the very bottom are a long way from what they act on.                                                                                         |
| 1024px | Welcome only: **two columns** in a 64rem centred frame, vertically centred in the window: the art on the left (1fr), the app name, heading, line and buttons on the right (26rem), 48px apart. The form screens (Log in, Create account, Email code, Forgot password) stay one centred 32rem column, buttons under the fields. |
| 1440px | Same as 1024px; the frame stays 64rem and centred, so the extra width is margin.                                                                                                                                                                                                                                               |

```text
640px                                1024px and 1440px (Welcome)
+------------------------------+     +------------------------------------------------+
|        [mark] Cleaning       |     |                                                |
|        +----------------+    |     |   +--------------------+  [mark] Cleaning      |
|        |   welcome art  |    |     |   |                    |                       |
|        +----------------+    |     |   |    welcome art     |  Know what needs      |
|        Know what needs       |     |   |    (1fr)           |  cleaning, and when.  |
|        cleaning, and when.   |     |   |                    |  One shared plan ...  |
|        One shared plan ...   |     |   +--------------------+                       |
|        [Create an account]   |     |                           [Create an account] |
|        [     Log in       ]  |     |                           [      Log in      ]|
|        (28rem column)        |     |   <------------- 64rem, centred ----------->   |
+------------------------------+     +------------------------------------------------+
```

### 4.2 Setup steps and Start or join

`/setup/rooms`, `/setup/appliances`, `/setup/reminders` (in `SetupScreen`, inside `AccountScreen`), and `/homes/new`. No navigation; Back link, step progress, heading, intro, the choices, Continue.

| Width  | Layout                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Phone  | As now: one 28rem column; each room type a card row (icon, name, stepper); appliances as grouped tick lists; Continue at the bottom.                                                                                                                                                                                                                                                                         |
| 640px  | One centred 28rem column, as on phones. Continue follows the choices (not pinned to the bottom).                                                                                                                                                                                                                                                                                                             |
| 1024px | The rooms and appliances steps widen to **42rem** (`lg:max-w-2xl`) and their choices go into **two columns** (`lg:grid-cols-2 lg:gap-3`): room rows are 330px each, enough for icon, name and stepper. Back, progress, heading and intro stay above, full width of the 42rem; Continue below the choices, 20rem wide at the start. Reminders and Start or join stay one 32rem column (they are short forms). |
| 1440px | Same as 1024px.                                                                                                                                                                                                                                                                                                                                                                                              |

```text
1024px and 1440px, Pick rooms
+----------------------------------------------------+
|        [<]                                         |
|        Step 1 of 3   [####][    ][    ]            |
|        Which rooms do you have?                    |
|        Tap + for each one. You can change ...      |
|        ROOMS                                       |
|        +---------------------+ +-----------------+ |
|        |[ic] Kitchen  [-]1[+]| |[ic] Bathroom ...| |
|        +---------------------+ +-----------------+ |
|        +---------------------+ +-----------------+ |
|        |[ic] Bedroom  [-]2[+]| |[ic] Laundry  ...| |
|        +---------------------+ +-----------------+ |
|        [   Continue   ]                            |
|        <------------ 42rem, centred ------------>  |
+----------------------------------------------------+
```

### 4.3 Today

`/today`. Header (Home switcher, "Today", the date and time left), the Everyone / Just me control, then Late, Today, Done today and Tomorrow; the all-done art when nothing is left.

| Width  | Layout                                                                                                                                                                                                                                         |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phone  | As now.                                                                                                                                                                                                                                        |
| 640px  | As phones, in the 592px column. The Everyone / Just me control is capped at **24rem** (`sm:max-w-sm`) so its two options aren't 290px wide each. No week strip.                                                                                |
| 1024px | **Split** frame. Header across the top. Main column (360px): the control, any error, the lists (or all done). Side column (320px): the **week strip**, or Job detail when a job is open. The all-done art stays in the main column, max 28rem. |
| 1440px | Same; main column 696px, side column 384px, 40px apart. Job rows stay one per line (a list is read top to bottom, two columns of rows would muddle Late before Today).                                                                         |

**The week strip** (side column, from 1024px only):

- A section headed **This week** (`SectionHeading`), with the week's progress under it in body text: "3 of 12 done", or "Nothing planned".
- A `Card raised={false}` holding this week's seven `DayRow`s (the home's week start, today marked as `DayRow` already does with `bg-kitchen` and `aria-current="date"`), each a link to `/week`.
- Below the card, a `ButtonLink variant="secondary"` "See the week" to `/week`.
- The strip's job tiles are plain pictures, not Move to… buttons: moving jobs belongs on Week, and the whole row is already a link.
- Always the current week (no previous / next here; that's what Week is for). Same data as Week's current week (`useWeek` at offset 0, one agenda request), fetched only when the strip is shown.
- States: loading ("Getting the week…" in a `role="status"` line, the card's space reserved so nothing jumps), error (one line and Try again, inside the card), empty (seven "Nothing planned" rows).
- Ticking a job on Today updates the strip at once (same cache), so its day's count moves.

```text
640px                                 1024px
+--------------------------------+    +--------+---------------------------------------------------+
| [Home switcher v]              |    | [mark] | [Home switcher v]                                 |
| Today                          |    | Name   | Today                                             |
| Tuesday 24 November · 40 min   |    |        | Tuesday 24 November · about 40 min                |
| [ Everyone | Just me ] (24rem) |    | >Today<+-------------------------+-----------------------+
| LATE                           |    |  Week  | [ Everyone | Just me ]  | THIS WEEK             |
| +----------------------------+ |    |  Home  | LATE                    | 3 of 12 done          |
| |[ic] Wipe benches  · 2d  [ ]| |    |  Sett. | +---------------------+ | +-------------------+ |
| +----------------------------+ |    |        | |[ic] Wipe benches [ ]| | | MON 23  [][][] 2/3| |
| TODAY                          |    |        | +---------------------+ | |*TUE 24* [][]   0/2| |
| +----------------------------+ |    |        | TODAY                   | | WED 25  Nothing   | |
| |[ic] Clean the oven      [ ]| |    |        | +---------------------+ | | THU 26  [][]   0/2| |
| +----------------------------+ |    |        | |[ic] Clean oven   [ ]| | | FRI 27  [][][] 0/3| |
| +----------------------------+ |    |        | +---------------------+ | | SAT 28  [][]   0/2| |
| |[ic] Vacuum the lounge   [ ]| |    |        | DONE TODAY              | | SUN 29  Nothing   | |
| +----------------------------+ |    |        | TOMORROW                | +-------------------+ |
| DONE TODAY / TOMORROW          |    |        |                         | [   See the week  ]   |
+--------------------------------+    +--------+-------------------------+-----------------------+
| [Today] [Week] [Home] [Sett.]  |                main 360px                side 320px, sticky
+--------------------------------+

1440px: the same, main column 696px and side column 384px, 40px apart.
```

### 4.4 Week

`/week`. Header (Home switcher, week title, dates and progress, previous / next week), the seven days in one card, then Coming up (this week only).

| Width  | Layout                                                                                                                                                                                                                                                                                                                                                   |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phone  | As now.                                                                                                                                                                                                                                                                                                                                                  |
| 640px  | As phones, in the 592px column (`DayRow`s have room for more job tiles per line, nothing else changes).                                                                                                                                                                                                                                                  |
| 1024px | **Split** frame. Header across the top with previous / next at its end. Main column: the days card, then Coming up under it (as on phones). Side column: a **hint** while no job is open ("Choose a job to see when it's due, who does it and how.", with a small `ArtFrame` at most 12rem wide; the same hint as Room), or Job detail when one is open. |
| 1440px | Same; main column 696px, so each `DayRow` shows its job tiles on one line for a typical day.                                                                                                                                                                                                                                                             |

The days' job tiles stay 44px buttons that open Move to… (a 32rem sheet) at every width; dragging them to another day on laptops is #261, an extra on top of the button, never instead of it.

Coming up stays in the main column because its rows open the panel: if it sat in the side column, opening a job would hide the list being worked through.

```text
1024px and 1440px
+--------+------------------------------------------------------------+
| [mark] | [Home switcher v]                              [<]  [>]    |
| Name   | This week                                                  |
|        | 23 – 29 Nov · 3 of 12 done                                 |
|  Today +------------------------------------+-----------------------+
| >Week< | +--------------------------------+ | +-------------------+ |
|  Home  | | MON 23 [][][]           2 of 3 | | |    (small art)    | |
|  Sett. | |*TUE 24*[][]             0 of 2 | | | Choose a job to   | |
|        | | ...                            | | | see when it's due,| |
|        | | SUN 29 Nothing planned         | | | who does it ...   | |
|        | +--------------------------------+ | +-------------------+ |
|        | COMING UP                          |  or Job detail        |
|        | Week of 30 Nov                     |  when a job is open   |
|        |  Clean the oven · Tuesday 1 Dec  > |                       |
|        |  Wash towels · Mon, Thu          > |                       |
+--------+------------------------------------+-----------------------+
```

### 4.5 Home

`/home`. Header (Home switcher, "Home", rooms and jobs count), the room tiles, Add a room and Reorder rooms, then Recently. Reorder mode swaps the tiles for the Move up / Move down list.

| Width  | Layout                                                                                                                                                                                                                                                                 |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phone  | As now: two tiles per row.                                                                                                                                                                                                                                             |
| 640px  | **Three tiles per row** (`sm:grid-cols-3`, 16px gaps: tiles about 187px). Add a room and Reorder rooms side by side (as now from 640px). Recently below, full column width. Add a room opens the **wide** sheet from 768px.                                            |
| 1024px | **Split** frame. Main column (360px): tiles **two per row** (168px each, the same as a large phone), Add a room and Reorder rooms stacked under them. Side column (320px): **Recently** (its heading, ten lines, See all). No job panel on Home (it has no job links). |
| 1440px | Main column (696px): **three tiles per row** (`xl:grid-cols-3`, about 221px each). Recently in the 384px side column.                                                                                                                                                  |

Tiles per row, worked out from the main column width so each tile stays at least 160px wide (room names at 22px fit on two lines). Four per row would only fit from about 1440px and would make tiles smaller than at 1024px, so it isn't used:

| Width | Main column | Tiles per row | Tile width |
| ----- | ----------- | ------------- | ---------- |
| 375   | 343px       | 2             | 166px      |
| 640   | 592px       | 3             | 187px      |
| 768   | 720px       | 3             | 229px      |
| 1024  | 360px       | 2             | 172px      |
| 1280  | 536px       | 3             | 168px      |
| 1440  | 696px       | 3             | 221px      |
| 1920  | 856px       | 3             | 275px      |

So: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3`. Dropping from three to two at 1024px is deliberate: that's where Recently moves beside the tiles.

Reorder mode uses the main column; Recently stays beside it.

```text
640px                                 1024px
+--------------------------------+    +--------+---------------------------------------------------+
| [Home switcher v]              |    | [mark] | [Home switcher v]                                 |
| Home                           |    | Name   | Home                                              |
| 5 rooms · 23 jobs              |    |        | 5 rooms · 23 jobs                                 |
| +--------+ +--------+ +------+ |    |  Today +-------------------------+-----------------------+
| |Kitchen | |Bathroom| |Bed-  | |    |  Week  | +---------+ +---------+ | RECENTLY              |
| |  (o)   | |  (o) 1 | |room  | |    | >Home< | | Kitchen | | Bathroom| | Sam · Oven · Tuesday  |
| +--------+ +--------+ +------+ |    |  Sett. | |   (o)   | |  (o)  1 | | You · Towels · Today  |
| +--------+ +--------+          |    |        | +---------+ +---------+ | ...                   |
| |Laundry | |Living  |          |    |        | +---------+ +---------+ | [      See all      ] |
| +--------+ +--------+          |    |        | | Bedroom | | Laundry | |                       |
| [+ Add a room] [Reorder rooms] |    |        | +---------+ +---------+ |                       |
| RECENTLY                       |    |        | [   + Add a room    ]   |                       |
| Sam · Clean the oven · Tuesday |    |        | [   Reorder rooms   ]   |                       |
+--------------------------------+    +--------+-------------------------+-----------------------+
| [Today] [Week] [Home] [Sett.]  |
+--------------------------------+

1440px: three tiles per row in the 696px main column, Recently in the 384px side column.
```

### 4.6 Room

`/room?id=`. Header (Back to Home, room name, job count, Edit room), Add a job, then the room's jobs soonest first, with freshness bars.

| Width  | Layout                                                                                                                                                                                                                                                    |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phone  | As now.                                                                                                                                                                                                                                                   |
| 640px  | As phones, in the 592px column. Job rows stay **one per line** (a list read soonest first; the freshness bar needs the width). Add a job stays full width (a dashed button is the room's one main action). Edit room opens the **wide** sheet from 768px. |
| 1024px | **Split** frame. Main column: Add a job and the job list. Side column: the **hint** (as on Week, worded "Choose a job to see when it's due, who does it and how.") or Job detail when a job is open.                                                      |
| 1440px | Same; main column 696px.                                                                                                                                                                                                                                  |

```text
1024px and 1440px, a job open
+--------+-----------------------------------------------------------+
| [mark] | [<]                                          [Edit room]  |
| Name   | Kitchen                                                   |
|        | 6 jobs                                                    |
|  Today +-----------------------------+-----------------------------+
|  Week  | [ + Add a job (dashed)    ] | Wipe the benches        [X] |
| >Home< | +=========================+ | Kitchen                     |
|  Sett. | |[ic] Wipe the benches    | | (due card, How often, Who,  |
|        | |  Every day · ######---  | |  How long, Room, Why,       |
|        | +=========================+ |  How to, History, Rename,   |
|        | +-------------------------+ |  Remove)                    |
|        | |[ic] Clean the oven      | |                             |
|        | +-------------------------+ |                             |
+--------+-----------------------------+-----------------------------+
```

### 4.7 Job detail (page)

`/job?id=`: what phones and tablets open, and what any width shows for a link opened directly or in a new tab. On laptops opened from a list, it's the side panel ([§3](#3-job-detail-as-a-side-panel)).

| Width  | Layout                                                                                                                                                                                                                                                               |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phone  | As now: header (Back to the room, job name, room), due card, about (how often, who, how long, room, why, how to, history), then Rename and Remove.                                                                                                                   |
| 640px  | As phones, in the 592px column. The due card's Skip and Snooze side by side (as now, `sm:grid-cols-2`), Rename and Remove side by side (as now).                                                                                                                     |
| 1024px | Column width (48rem), centred in the content area, **two columns** as now: the due card on the left, About on the right (`lg:grid-cols-2 lg:items-start`), Rename and Remove under both. The progress buttons stack in the narrower card (`lg:grid-cols-1`, as now). |
| 1440px | Same, Skip and Snooze back side by side from 1536px (`2xl:grid-cols-2`, as now).                                                                                                                                                                                     |

No change from what's built: this section records it so the panel and the page stay the same content.

### 4.8 Add a job

`/room/add?id=`. Header (Back to the room, "Add a job", room name), Make your own, then search the library and the library's jobs for this room, each with Add.

| Width  | Layout                                                                                                                                                                                                                                                                              |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phone  | As now.                                                                                                                                                                                                                                                                             |
| 640px  | As phones, in the 592px column. The search field and the Show control capped at 32rem (`sm:max-w-lg`).                                                                                                                                                                              |
| 1024px | Column width (48rem). The library's jobs go into **two columns** (`lg:grid-cols-2 lg:gap-3`, each about 340px: name, how often and Add fit on one row). Make your own stays a full-width dashed button above the search. No side panel (the library's jobs aren't in the home yet). |
| 1440px | Same as 1024px.                                                                                                                                                                                                                                                                     |

```text
1024px and 1440px
+--------+------------------------------------------------------+
| [mark] |     [<]                                              |
| Name   |     Add a job                                        |
|        |     Kitchen                                          |
|  Today |     +----------------------------------------------+ |
|  Week  |     | Make your own   [ Make your own job ]         | |
| >Home< |     +----------------------------------------------+ |
|  Sett. |     [ Search the library...   ] (32rem)              |
|        |     +----------------------+ +---------------------+ |
|        |     | Clean the oven [Add] | | Wipe benches  [Add] | |
|        |     | Every 3 months       | | Every day           | |
|        |     +----------------------+ +---------------------+ |
|        |     <-------------- 48rem column, centred ------->   |
+--------+------------------------------------------------------+
```

### 4.9 Settings

`/settings`, and the pages under it: Home settings, Your account, Change email, Change password, Delete account.

| Width  | Layout                                                                                                                                                                                  |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phone  | As now: You, the home's people, Use it like an app, Sign out, one under another.                                                                                                        |
| 640px  | As phones, in the 592px column.                                                                                                                                                         |
| 768px  | **Two columns** from `md:` instead of `lg:` (720px: 348px each): You on the left, the home's people on the right, aligned to the top. Use it like an app and Sign out full width below. |
| 1024px | Column width (48rem), two columns as at 768px. No split frame: Settings is short, and stretching it to 80rem would leave cards half empty.                                              |
| 1440px | Same as 1024px.                                                                                                                                                                         |

The pages under Settings, from 768px:

- **Home settings**: two columns: the home's people (with Manage) on the left; Invite someone and the home's details (owner) on the right. Leave this home and Delete this home full width below, apart from the rest.
- **Your account**: two columns: your details (Change name and colour, Change email, Change password) on the left; your homes on the right. Sign out and Delete account full width below.
- **Change email, Change password, Delete account**: one column, fields at most 32rem ([§2.2](#22-content-widths)).

```text
768px                                   1024px and 1440px
+----------------------------------+    +--------+--------------------------------------------+
| Settings                         |    | [mark] |    Settings                                |
| +--------------+ +--------------+|    | Name   |    +-------------------+ +------------------+ |
| | YOU          | | HOME PEOPLE  ||    |        |    | YOU               | | OUR FLAT         | |
| | (o) Alex     | | (o) Alex  *  ||    |  Today |    | (o) Alex          | | (o) Alex  owner  | |
| | alex@...     | | (o) Sam      ||    |  Week  |    | [ Your account ]  | | (o) Sam          | |
| |[Your account]| |[Home sett.]  ||    |  Home  |    +-------------------+ | [Home settings]  | |
| +--------------+ +--------------+|    | >Sett.<|                          +------------------+ |
| USE IT LIKE AN APP               |    |        |    USE IT LIKE AN APP                      |
| [ Sign out ]                     |    |        |    [ Sign out ]                            |
+----------------------------------+    |        |    <---------- 48rem, centred -------->     |
| [Today] [Week] [Home] [Sett.]    |    +--------+--------------------------------------------+
+----------------------------------+
```

---

## 5. Who builds what

| Issue                                                              | Builds                                                                                                                                                                                                                | Sections                                                                                        |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| #264 Shell frame (`lane: shell`)                                   | `AppShell layout="split"`, `TwoColumns`, `useIsLaptop`, the side-column hint, `BottomSheet size="wide"`. First: #199, #200 and #201 use them.                                                                         | [§2.2](#22-content-widths), [§2.4](#24-the-two-column-frame), [§2.5](#25-sheets-and-dialogs)    |
| #199 Today beside the week (`lane: today-week`)                    | Today's split frame and the week strip; Week's split frame with Coming up in the main column and the hint beside; the 24rem filter control.                                                                           | [§4.3](#43-today), [§4.4](#44-week)                                                             |
| #200 Job detail as a side panel (`lane: job`, `lane: shell`)       | The panel: catching job links, `job=` in the address, the panel's content and focus, closing, the marked row, falling back to the page below 1024px. Wired through `TwoColumns opensJobs`, so screens need no change. | [§3](#3-job-detail-as-a-side-panel), [§4.7](#47-job-detail-page)                                |
| #201 Home, Room and Settings (`lane: home-room`, `lane: settings`) | Home's tiles per row and Recently beside the tiles; Room's split frame and hint; wide Add a room and Edit room sheets; Settings, Home settings and Your account in two columns from 768px; 32rem forms.               | [§4.5](#45-home), [§4.6](#46-room), [§4.9](#49-settings)                                        |
| #265 Signed-out and setup (`lane: account`, `lane: setup`)         | Welcome in two columns from 1024px, buttons following the content from 640px, setup choices in two columns from 1024px.                                                                                               | [§4.1](#41-welcome-and-the-other-signed-out-screens), [§4.2](#42-setup-steps-and-start-or-join) |
| #266 Add a job (`lane: home-room`)                                 | The library in two columns from 1024px, the search and Show control at 32rem.                                                                                                                                         | [§4.8](#48-add-a-job)                                                                           |

Job detail as a page (§4.7) is already built as specified.

---

## 6. Tests

Each building issue adds, for the screens it changes:

- **Layout switch**: a Playwright check in the screen's `e2e/<screen>.viewports.spec.ts` that at 1024px the rail is visible and the tab bar isn't, and at 1023px the reverse (the `TabBar` is one element, so check its computed position or width, not two elements).
- **Columns**: at 1024px and 1440px, the side column sits to the right of the main column (bounding boxes) with the widths from [§2.4](#24-the-two-column-frame) (±1px); at 1023px the side content is either below the main column or not in the page, as the screen says.
- **Panel** (#200): opening a job at 1280px keeps the list and puts Job detail beside it with focus on its heading, the address has `job=`, Back closes it and focus returns to the row; Ctrl+click opens the page; at 390px a job row opens the full page; a `job=` address opened on a phone becomes `/job?id=`.
- **Sheets**: a wide sheet is 40rem at 1024px and fits inside 320px.
- The viewport matrix (320–1920px: no sideways scroll, 44px targets, no axe violations) keeps passing, with the panel open as one of the states checked on Today.

---

## 7. Open questions

For the owner. Until answered, this spec's choice stands; a different answer becomes a follow-up issue.

1. **Panel address.** The side panel puts `job=<id>` on the list's address (`/today?job=abc`) instead of switching to `/job?id=abc`, for the static-export reason in [§3](#3-job-detail-as-a-side-panel). Links shared from the panel open the list with the job beside it on a laptop, and the full Job detail page on a phone. Is that acceptable?
2. **The side column on Week and Room** shows a hint until a job is opened. Alternatives: a summary of the week (done, time left) on Week and of the room (how up to date, its appliances) on Room. Hint, summaries, or something else?
3. **Coming up on other weeks.** Coming up shows only under this week. On a laptop there's room to show it for whichever week is open. Keep it to this week?
4. **Rail width at 1024px.** The rail is 240px at every laptop width, which leaves Today's list 360px at 1024px. A narrower rail (icons over labels, 96px) between 1024 and 1279px would give the list 500px. Keep 240px everywhere?
5. **Welcome on a laptop**: art on the left and words on the right ([§4.1](#41-welcome-and-the-other-signed-out-screens)), or keep it one centred column like the other signed-out screens?
