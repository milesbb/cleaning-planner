# Web — Claude Context

## README

`README.md` at the repo root is the developer setup guide. If your changes affect anything it documents — stack choices, env vars, CI/CD behaviour, or setup steps — update `README.md` to match.

Next.js App Router, built as a **static export** (`output: 'export'`, `trailingSlash: true`): the files in `out/` are the website on Vercel **and** the UI inside the iOS and Android apps (`apps/mobile`). Mobile-first, and every screen must work from 320px to 1920px wide.

## Static export — non-negotiable rules

- No server-only features: no route handlers, server actions, middleware, `cookies()`/`headers()`, or data fetching on the server. All data comes from the API at runtime in the browser.
- Pages that show a record read its id from the query string with `readRecordId` (`/job?id=…`), never from a dynamic route segment, because the export can't know users' ids.
- Metadata routes (`manifest.ts` and similar) declare `export const dynamic = 'force-static'`.
- Images use `next/image` with `unoptimized` (set in `next.config.ts`); there is no image server.
- **Content-Security-Policy**: `npm run build` runs `scripts/apply-content-security-policy.ts` after `next build`. It hashes each page's inline scripts and writes a strict policy into that page's `<head>` (only our files, those exact scripts, our API and Cognito). Never add inline event handlers, third-party scripts or `eval`. ESLint bans `dangerouslySetInnerHTML` and `eval`. Other security headers (HSTS, no framing, `nosniff`, referrer and permissions policies) are in `vercel.json`, with tests in `scripts/vercel-headers.test.ts`.
- Tests run against the exported files: `npm run start` serves `out/` with `serve`, and Playwright and Lighthouse use it in CI.

## Key files

| File                       | Purpose                                                                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/layout.tsx`       | Root layout, metadata, viewport/theme colour, iOS home-screen settings.                                                                                                 |
| `src/app/manifest.ts`      | Web app manifest. `display: standalone` is required for iOS web push — never change it.                                                                                 |
| `src/app/globals.css`      | Wall chart tokens as CSS variables (softened palette by default, `data-palette="original"` for the original) and the Tailwind `@theme`, paper grain, shadows and radii. |
| `src/lib/design-tokens.ts` | The palettes in TypeScript. Tests keep them identical to `globals.css` and check every text/background pair is at least 4.5:1.                                          |
| `src/lib/record-id.ts`     | `readRecordId(query, name)`: the only way pages read a record id from the URL (validated, `null` when missing or malformed).                                            |
| `src/lib/format-date.ts`   | Display formatting for `CalendarDate` values (en-GB).                                                                                                                   |
| `src/lib/app-identity.ts`  | App name, short name, description and theme colours. The single source for metadata and the manifest.                                                                   |
| `public/icons/`            | PNG app icons, generated from `src/app/icon.svg`. Regenerate all sizes if the SVG changes.                                                                              |

## Rules

- **Scheduling logic lives in `@cleaning-planner/schedule`.** Never compute due dates or intervals in a component; import from the package (`@cleaning-planner/schedule/next-due`).
- Use shadcn/ui components (`npx shadcn add <component>`, into `src/components/ui/`) before writing custom UI elements. The first `shadcn add` also creates `src/lib/utils.ts` with its `cn()` class merger: keep that name, because generated components import it. It is the one exception to the naming rules.
- Tailwind only for styling — no CSS modules, no inline style objects. Use the Wall chart tokens (`bg-paper`, `bg-card`, `text-ink`, `bg-kitchen`…`bg-whole-home`, `bg-late`, `shadow-hard`, `rounded-card`, `font-display`), never raw hex. A new colour goes into both palettes in `design-tokens.ts` and `globals.css`.
- Text is always `text-ink` (or `text-card` on an ink background); there is no grey text, because it fails contrast on the room colours.
- Never disable pinch-zoom (`maximumScale` / `userScalable`) in the viewport.
- Respect safe areas (`env(safe-area-inset-*)`) — the app runs full-screen from the iOS home screen.

## Component structure

- A page file (`page.tsx`) handles data fetching and layout only. Visual sections go into named child components in the same directory.
- Each component does one thing. Name components after what they display (`TaskRow`, not `Row`).

## Responsive design — non-negotiable rules

**Every UI must work on mobile (all screen sizes) and laptop. There are no exceptions.**

- Mobile-first; layer up with `sm:` / `md:` / `lg:`.
- Touch targets at least 44×44px. No hover-only interactions.
- Before marking any UI task complete, check it at a narrow mobile viewport and a laptop viewport. The app is light-only for now; dark mode is a later item in `docs/PLAN.md`.

## Test-driven development — non-negotiable rules

1. Write a failing test that specifies the expected behaviour.
2. Write the minimum code to make it pass.
3. Refactor — keep the test green.

Never write implementation code that is not covered by a test.

## Tests

- Vitest + React Testing Library, jsdom. Test files sit next to the source (`page.tsx` → `page.test.tsx`). Run `npm test` from `apps/web`.
- Test user-facing behaviour (roles, text, callbacks), not internal state.
- **Every component test file includes an axe check** as the first test in the first rendering `describe`:
  ```ts
  import { axe } from 'vitest-axe';
  it('has no accessibility violations', async () => {
    const { container } = render(<Component />);
    expect(await axe(container)).toHaveNoViolations();
  });
  ```
  The `toHaveNoViolations` matcher is defined in `src/test/setup.ts` (the one bundled with `vitest-axe` is incompatible with current Vitest). For open Radix portals/dialogs, pass `document.body` instead of `container`.
- **E2E (Playwright):** every new page or user flow gets a spec in `e2e/` covering the happy path and at least one error/edge case. Specs run on three projects: `desktop` (Chrome), `android` (Pixel 7) and `iphone` (iPhone 15, WebKit). Run `npm run test:e2e` from `apps/web` (uses `next dev` locally; CI runs against `next start` after a build).

## Types

- All exported function return types explicit (ESLint enforces explicit return types everywhere).
- No `any`; `unknown` only when immediately narrowed. No type assertions (`assertionStyle: never` is enforced).
- `interface` for object shapes, `type` for unions.
