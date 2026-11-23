import { rmSync } from 'node:fs';
import { injectManifest } from '@serwist/build';
import { build } from 'esbuild';
import { bundleSettings, bundledSourcePath, precacheSettings } from './build-settings.ts';

const OUT_DIRECTORY = 'out';

const bundledSource = bundledSourcePath(OUT_DIRECTORY);
await build(bundleSettings(bundledSource));
const { count, size, warnings } = await injectManifest(
  precacheSettings(OUT_DIRECTORY, bundledSource),
);
rmSync(bundledSource);
if (warnings.length > 0) throw new Error(`Service worker build warnings:\n${warnings.join('\n')}`);
const KILOBYTE = 1024;
process.stdout.write(
  `Service worker precaches ${String(count)} files (${String(Math.round(size / KILOBYTE))} KB)\n`,
);
