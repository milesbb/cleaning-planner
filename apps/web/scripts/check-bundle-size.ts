import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { BUDGET, budgetProblems, type PageScripts, scriptSourcesIn } from './bundle-size.ts';

const EXPORT_FOLDER = 'out';
const INDEX_PAGE = 'index.html';

function routeOf(relativePath: string): string {
  const folder = relativePath.slice(0, -INDEX_PAGE.length).replaceAll('\\', '/');
  return `/${folder}`;
}

function pageScripts(relativePath: string): PageScripts {
  const html = readFileSync(join(EXPORT_FOLDER, relativePath), 'utf8');
  return {
    route: routeOf(relativePath),
    scripts: scriptSourcesIn(html).map((source) => ({
      path: source,
      gzipBytes: gzipSync(readFileSync(join(EXPORT_FOLDER, source))).length,
    })),
  };
}

const pages = readdirSync(EXPORT_FOLDER, { recursive: true, encoding: 'utf8' })
  .filter((path) => path.endsWith(INDEX_PAGE) && !path.startsWith('_'))
  .map(pageScripts);
const problems = budgetProblems(pages, BUDGET);

for (const page of pages) {
  const kilobytes = page.scripts.reduce((sum, script) => sum + script.gzipBytes, 0) / 1024;
  process.stdout.write(`${page.route.padEnd(30)} ${kilobytes.toFixed(1)} KB\n`);
}
if (problems.length > 0) {
  process.stderr.write(`JavaScript budget exceeded:\n${problems.join('\n')}\n`);
  process.exitCode = 1;
}
