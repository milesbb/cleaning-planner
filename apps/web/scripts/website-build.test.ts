import { describe, expect, it, vi } from 'vitest';
import { affectsWebsite, decideWebsiteBuild, type ChangedPaths } from './website-build.ts';

describe('affectsWebsite', () => {
  it.each([
    ['a website file', 'apps/web/src/app/today/page.tsx'],
    ['the website config', 'apps/web/vercel.json'],
    ['the schedule engine', 'packages/schedule/src/next-due.ts'],
    ['the shared contracts', 'packages/contracts/src/jobs.ts'],
    ['the lockfile', 'package-lock.json'],
    ['the root package.json', 'package.json'],
    ['the Turborepo config', 'turbo.json'],
    ['the shared TypeScript config', 'tsconfig.base.json'],
  ])('is true for %s', (_, path) => {
    expect(affectsWebsite([path])).toBe(true);
  });

  it.each([
    ['an API-only change', ['apps/api/src/app.ts', 'apps/api/src/app.test.ts']],
    ['an infrastructure-only change', ['infrastructure/template.yml']],
    ['a docs-only change', ['docs/PLAN.md', 'README.md']],
    ['notes inside the website folder', ['apps/web/CLAUDE.md', 'apps/web/src/app/week/CLAUDE.md']],
    ['a workflow change', ['.github/workflows/pr-checks.yml']],
    ['a package whose name starts like a website one', ['packages/schedule-tools/index.ts']],
    ['no change at all', []],
  ])('is false for %s', (_, paths) => {
    expect(affectsWebsite(paths)).toBe(false);
  });

  it('is true when any one of several changes affects the website', () => {
    expect(affectsWebsite(['apps/api/src/app.ts', 'packages/contracts/src/jobs.ts'])).toBe(true);
  });
});

describe('decideWebsiteBuild', () => {
  const apiOnly: ChangedPaths = { found: true, paths: ['apps/api/src/app.ts'] };
  const websiteChange: ChangedPaths = { found: true, paths: ['apps/web/src/app/page.tsx'] };

  it('always builds production, without looking at the changes', () => {
    const findChangedPaths = vi.fn(() => apiOnly);

    const decision = decideWebsiteBuild({ environment: 'production' }, findChangedPaths);

    expect(decision.shouldBuild).toBe(true);
    expect(findChangedPaths).not.toHaveBeenCalled();
  });

  it('builds a preview whose changes affect the website', () => {
    const decision = decideWebsiteBuild({ environment: 'preview' }, () => websiteChange);

    expect(decision).toEqual({
      shouldBuild: true,
      reason: 'This branch changes files the website is built from.',
    });
  });

  it('skips a preview whose changes leave the website alone', () => {
    const decision = decideWebsiteBuild({ environment: 'preview' }, () => apiOnly);

    expect(decision).toEqual({
      shouldBuild: false,
      reason: 'Nothing the website is built from changed, so there is nothing new to preview.',
    });
  });

  it('builds, and says why, when the changes cannot be worked out', () => {
    const decision = decideWebsiteBuild({ environment: 'preview' }, () => ({
      found: false,
      problem: 'fatal: no merge base',
    }));

    expect(decision).toEqual({
      shouldBuild: true,
      reason: 'Could not tell what this branch changes (fatal: no merge base), so building.',
    });
  });

  it('builds when the environment is not set', () => {
    const decision = decideWebsiteBuild({ environment: undefined }, () => apiOnly);

    expect(decision.shouldBuild).toBe(true);
  });
});
