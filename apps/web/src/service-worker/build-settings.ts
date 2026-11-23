import type { InjectManifestOptions } from '@serwist/build';
import type { BuildOptions } from 'esbuild';

const SERVICE_WORKER_ENTRY = 'src/service-worker/service-worker.ts';
const SERVICE_WORKER_FILE = 'sw.js';
const BUNDLED_SOURCE_FILE = 'sw.source.js';
const HASHED_BUILD_FILES = /^_next\/static\//;

export function bundledSourcePath(outDirectory: string): string {
  return `${outDirectory}/${BUNDLED_SOURCE_FILE}`;
}

export function bundleSettings(bundledSource: string): BuildOptions {
  return {
    entryPoints: [SERVICE_WORKER_ENTRY],
    outfile: bundledSource,
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2022',
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'warning',
  };
}

export function precacheSettings(
  outDirectory: string,
  bundledSource: string,
): InjectManifestOptions {
  return {
    swSrc: bundledSource,
    swDest: `${outDirectory}/${SERVICE_WORKER_FILE}`,
    globDirectory: outDirectory,
    globPatterns: ['**/*.{html,txt,js,css,woff2,png,svg,ico,webmanifest}'],
    globIgnores: [SERVICE_WORKER_FILE, BUNDLED_SOURCE_FILE],
    dontCacheBustURLsMatching: HASHED_BUILD_FILES,
  };
}
