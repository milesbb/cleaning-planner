import { describe, expect, it } from 'vitest';
import { bundleSettings, precacheSettings } from './build-settings';

describe('bundleSettings', () => {
  it('bundles the worker source into one minified script for the browser', () => {
    expect(bundleSettings('out/sw.source.js')).toMatchObject({
      entryPoints: ['src/service-worker/service-worker.ts'],
      outfile: 'out/sw.source.js',
      bundle: true,
      minify: true,
      format: 'iife',
      define: { 'process.env.NODE_ENV': '"production"' },
    });
  });
});

describe('precacheSettings', () => {
  const settings = precacheSettings('out', 'out/sw.source.js');

  it('writes the finished worker where the site registers it', () => {
    expect(settings).toMatchObject({
      swSrc: 'out/sw.source.js',
      swDest: 'out/sw.js',
      globDirectory: 'out',
    });
  });

  it('keeps every page, its route data and its scripts, styles, fonts and icons', () => {
    expect(settings.globPatterns).toEqual(['**/*.{html,txt,js,css,woff2,png,svg,ico,webmanifest}']);
  });

  it('leaves out the worker itself and its unbundled source', () => {
    expect(settings.globIgnores).toEqual(expect.arrayContaining(['sw.js', 'sw.source.js']));
  });

  it('trusts the hash in a built file name instead of adding its own', () => {
    expect(settings.dontCacheBustURLsMatching?.test('_next/static/chunks/main-a1b2.js')).toBe(true);
    expect(settings.dontCacheBustURLsMatching?.test('today/index.html')).toBe(false);
  });
});
