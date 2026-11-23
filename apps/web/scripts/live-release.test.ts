import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { addContentSecurityPolicy } from './content-security-policy';
import {
  BACKEND_PATHS,
  LIVE_SITE_URL,
  apiOriginFromPage,
  expectedApiCommit,
  hasContentSecurityPolicy,
  liveRoutesFrom,
  releaseTouchesBackend,
} from './live-release';

const API_ORIGIN = 'https://api.example.test';
const PAGE = addContentSecurityPolicy('<html><head></head><body></body></html>', API_ORIGIN);

function pipelineTriggerPaths(): string[] {
  const template = readFileSync(resolve('../../infrastructure/template.yml'), 'utf8');
  const filePaths = /FilePaths:\s+Includes:\s+((?:\s*- .+\n)+)/.exec(template)?.[1] ?? '';
  return [...filePaths.matchAll(/- (.+)/g)].map((match) => (match[1] ?? '').trim());
}

describe('LIVE_SITE_URL', () => {
  it('is the website the API lets call it (AllowedOrigins in template.yml)', () => {
    const template = readFileSync(resolve('../../infrastructure/template.yml'), 'utf8');
    const allowedOrigins = /AllowedOrigins:[\s\S]*?Default: (.+)/.exec(template)?.[1] ?? '';
    expect(allowedOrigins.split(',')).toContain(LIVE_SITE_URL);
  });
});

describe('liveRoutesFrom', () => {
  it('lists every page the site serves, from the app directory', () => {
    expect(
      liveRoutesFrom([
        'src/app/page.tsx',
        'src/app/today/page.tsx',
        'src\\app\\settings\\account\\page.tsx',
        'src/app/today/today-screen.tsx',
      ]),
    ).toEqual(['/', '/settings/account/', '/today/']);
  });

  it('leaves out review pages, which the live site never has', () => {
    expect(liveRoutesFrom(['src/app/dev/components/page.dev.tsx'])).toEqual([]);
  });
});

describe('hasContentSecurityPolicy', () => {
  it('finds the policy the build writes into each page', () => {
    expect(hasContentSecurityPolicy(PAGE)).toBe(true);
  });

  it('notices a page without one', () => {
    expect(hasContentSecurityPolicy('<html><head></head></html>')).toBe(false);
  });
});

describe('apiOriginFromPage', () => {
  it('reads the API address from the policy, which allows the page to call it', () => {
    expect(apiOriginFromPage(PAGE)).toBe(API_ORIGIN);
  });

  it('fails clearly when the page names no API', () => {
    const withoutApi = addContentSecurityPolicy('<html><head></head></html>', undefined);
    expect(() => apiOriginFromPage(withoutApi)).toThrow('names no API address');
  });
});

describe('releaseTouchesBackend', () => {
  it('matches the paths that start the backend pipeline in template.yml', () => {
    expect([...BACKEND_PATHS]).toEqual(pipelineTriggerPaths());
  });

  it.each([
    'apps/api/src/app.ts',
    'packages/schedule/src/next-due.ts',
    'infrastructure/template.yml',
    'package-lock.json',
  ])('counts %s as a backend change', (file) => {
    expect(releaseTouchesBackend(['README.md', file])).toBe(true);
  });

  it.each(['apps/web/src/app/page.tsx', 'docs/PLAN.md', 'apps/web/package.json'])(
    'does not count %s',
    (file) => {
      expect(releaseTouchesBackend([file])).toBe(false);
    },
  );
});

describe('expectedApiCommit', () => {
  it('expects the release itself when it changed the backend', () => {
    expect(
      expectedApiCommit({
        changedFiles: ['apps/api/src/app.ts'],
        releaseCommit: 'release-sha',
        lastBackendRelease: 'older-sha',
      }),
    ).toBe('release-sha');
  });

  it('expects the last release that changed the backend otherwise', () => {
    expect(
      expectedApiCommit({
        changedFiles: ['apps/web/src/app/page.tsx'],
        releaseCommit: 'release-sha',
        lastBackendRelease: 'older-sha',
      }),
    ).toBe('older-sha');
  });
});
