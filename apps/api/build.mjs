import { build } from 'esbuild';
import { rm, writeFile } from 'node:fs/promises';
import process from 'node:process';

const version = process.env.CODEBUILD_RESOLVED_SOURCE_VERSION ?? 'local';

await rm('dist', { recursive: true, force: true });

// The two Lambda functions: the API and notify (reminders).
const lambdaBundle = {
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'cjs',
  sourcemap: true,
  minify: true,
  legalComments: 'none',
};

await build({
  ...lambdaBundle,
  entryPoints: ['src/lambda.ts'],
  outfile: 'dist/lambda.js',
  define: { 'process.env.APP_VERSION': JSON.stringify(version) },
});

await build({ ...lambdaBundle, entryPoints: ['src/notify.ts'], outfile: 'dist/notify.js' });

await build({
  entryPoints: ['src/health-check.ts'],
  outfile: 'dist/health-check.mjs',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  legalComments: 'none',
});

await writeFile('dist/package.json', JSON.stringify({ type: 'commonjs' }));
