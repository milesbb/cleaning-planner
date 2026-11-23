import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readJson(path: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(readFileSync(resolve(path), 'utf8'));
  if (typeof parsed !== 'object' || parsed === null) throw new Error(`${path} is not an object`);
  return Object.fromEntries(Object.entries(parsed));
}

const vercel = readJson('vercel.json');
const scripts = readJson('package.json').scripts;

// Vercel's Next.js preset serves its own build output and never reads out/,
// so the Content-Security-Policy added to the exported pages would be lost.
describe('the website Vercel serves (vercel.json)', () => {
  it('is the exported out/ folder, built by our own build script', () => {
    expect(vercel).toMatchObject({
      framework: null,
      buildCommand: 'npm run build',
      outputDirectory: 'out',
    });
  });

  it('has the Content-Security-Policy added by that build script', () => {
    const build = typeof scripts === 'object' && scripts !== null && 'build' in scripts;
    expect(build && String(scripts.build)).toContain('scripts/apply-content-security-policy.ts');
  });
});

describe('which pushes Vercel builds (vercel.json)', () => {
  it('asks scripts/vercel-ignored-build-step.ts whether a push changes the website', () => {
    expect(vercel.ignoreCommand).toBe('node scripts/vercel-ignored-build-step.ts');
  });

  it('never deploys the development branch itself, but does deploy production', () => {
    expect(vercel.git).toEqual({ deploymentEnabled: { development: false } });
  });
});
