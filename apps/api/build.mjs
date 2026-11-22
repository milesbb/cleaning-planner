import { build } from 'esbuild';
import { rm, writeFile } from 'node:fs/promises';
import process from 'node:process';

const version = process.env.CODEBUILD_RESOLVED_SOURCE_VERSION ?? 'local';

await rm('dist', { recursive: true, force: true });

await build({
  entryPoints: ['src/lambda.ts'],
  outfile: 'dist/lambda.js',
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'cjs',
  sourcemap: true,
  legalComments: 'none',
  define: { 'process.env.APP_VERSION': JSON.stringify(version) },
});

await writeFile('dist/package.json', JSON.stringify({ type: 'commonjs' }));
