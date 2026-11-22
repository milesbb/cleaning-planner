## What

Closes #

## Tests

<!-- What was added or updated, and what it proves. Every change needs tests. -->

## Checklist

- [ ] Tests added or updated for every change (axe check in component tests; Playwright for new screens or flows)
- [ ] **Security**: inputs validated with a contracts schema; household routes check membership (with a 403 test); no secrets or personal data in code, logs or URLs
- [ ] **Robustness**: loading, empty, error and offline states; writes idempotent and conditional; optimistic updates roll back
- [ ] **Speed**: no new heavy dependency; no layout shift; animations use transform/opacity and respect reduced motion
- [ ] **Every size**: checked at 320–1920px wide with no horizontal scroll and 44px touch targets
- [ ] Docs updated (`README.md`, `CLAUDE.md`, `docs/`) if behaviour or setup changed
