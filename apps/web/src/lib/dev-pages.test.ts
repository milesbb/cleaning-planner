import { describe, expect, it } from 'vitest';
import { includesDevPages, pageExtensionsFor } from './dev-pages';

describe('includesDevPages', () => {
  it('leaves review pages out of production builds', () => {
    expect(includesDevPages({ NODE_ENV: 'production' })).toBe(false);
  });

  it('leaves them out of the live Vercel site', () => {
    expect(includesDevPages({ NODE_ENV: 'production', VERCEL_ENV: 'production' })).toBe(false);
  });

  it('includes them when developing locally', () => {
    expect(includesDevPages({ NODE_ENV: 'development' })).toBe(true);
  });

  it('includes them on Vercel previews of pull requests', () => {
    expect(includesDevPages({ NODE_ENV: 'production', VERCEL_ENV: 'preview' })).toBe(true);
  });

  it('includes them in a production build when asked, for the end-to-end tests', () => {
    expect(includesDevPages({ NODE_ENV: 'production', INCLUDE_DEV_PAGES: 'true' })).toBe(true);
  });

  it('never includes them on the live Vercel site, even when asked', () => {
    expect(
      includesDevPages({
        NODE_ENV: 'production',
        VERCEL_ENV: 'production',
        INCLUDE_DEV_PAGES: 'true',
      }),
    ).toBe(false);
  });
});

describe('pageExtensionsFor', () => {
  it('only treats page.dev.tsx files as pages when review pages are included', () => {
    expect(pageExtensionsFor({ NODE_ENV: 'production' })).toEqual(['tsx', 'ts']);
    expect(pageExtensionsFor({ NODE_ENV: 'development' })).toEqual(['tsx', 'ts', 'dev.tsx']);
  });
});
