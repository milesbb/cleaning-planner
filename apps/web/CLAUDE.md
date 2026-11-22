# Web — Claude Context

## README

`README.md` at the repo root is the developer setup guide. If your changes affect anything it documents — stack choices, env vars, CI/CD behaviour, or setup steps — update `README.md` to match.

Next.js App Router PWA, deployed to Vercel. Mobile-first: most use is from a phone home screen.

## Key files

| File                     | Purpose                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `src/app/layout.tsx`     | Root layout, metadata, viewport/theme colour, iOS home-screen settings.                            |
| `src/app/manifest.ts`    | Web app manifest. `display: standalone` is required for iOS web push — never change it.            |
| `src/app/globals.css`    | Tailwind v4 theme tokens (light + dark). Add colours here as tokens, not as raw hex in components. |
| `src/lib/format-date.ts` | Display formatting for `CalendarDate` values (en-GB).                                              |
| `src/lib/utils.ts`       | `cn()` class merger for shadcn/ui components.                                                      |
| `public/icons/`          | PNG app icons, generated from `src/app/icon.svg`. Regenerate all sizes if the SVG changes.         |

## Rules

- **Scheduling logic lives in `@cleaning-planner/schedule`.** Never compute due dates or intervals in a component; import from the package (`@cleaning-planner/schedule/next-due`).
- Use shadcn/ui components (`npx shadcn add <component>`, into `src/components/ui/`) before writing custom UI elements.
- Tailwind only for styling — no CSS modules, no inline style objects. Use the theme tokens (`bg-card`, `text-muted`, `text-primary`…) so dark mode keeps working.
- Never disable pinch-zoom (`maximumScale` / `userScalable`) in the viewport.
- Respect safe areas (`env(safe-area-inset-*)`) — the app runs full-screen from the iOS home screen.

## Component structure

- A page file (`page.tsx`) handles data fetching and layout only. Visual sections go into named child components in the same directory.
- Each component does one thing. Name components after what they display (`TaskRow`, not `Row`).

## Responsive design — non-negotiable rules

**Every UI must work on mobile (all screen sizes) and laptop. There are no exceptions.**

- Mobile-first; layer up with `sm:` / `md:` / `lg:`.
- Touch targets at least 44×44px. No hover-only interactions.
- Before marking any UI task complete, check it at a narrow mobile viewport and a laptop viewport, in light **and** dark mode.

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
