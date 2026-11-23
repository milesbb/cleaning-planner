interface ScriptSize {
  path: string;
  gzipBytes: number;
}

export interface PageScripts {
  route: string;
  scripts: readonly ScriptSize[];
}

export interface Budget {
  totalKilobytes: number;
  routeSpecificKilobytes: number;
}

export const BUDGET: Budget = { totalKilobytes: 220, routeSpecificKilobytes: 60 };

const BYTES_PER_KILOBYTE = 1024;
const SCRIPT_TAG_PATTERN = /<script\b[^>]*>/gi;
const SOURCE_PATTERN = /\ssrc="([^"]+)"/i;
const LEGACY_ONLY_PATTERN = /\snomodule\b/i;

// Scripts a modern browser downloads: `noModule` polyfills are for old browsers only.
export function scriptSourcesIn(html: string): string[] {
  return [...html.matchAll(SCRIPT_TAG_PATTERN)]
    .map(([tag]) => tag)
    .filter((tag) => !LEGACY_ONLY_PATTERN.test(tag))
    .flatMap((tag) => SOURCE_PATTERN.exec(tag)?.[1] ?? []);
}

function kilobytes(bytes: number): string {
  return (bytes / BYTES_PER_KILOBYTE).toFixed(1);
}

function totalBytes(scripts: readonly ScriptSize[]): number {
  return scripts.reduce((sum, script) => sum + script.gzipBytes, 0);
}

function sharedScriptPaths(pages: readonly PageScripts[]): Set<string> {
  const [firstPage, ...otherPages] = pages;
  const firstPaths = firstPage?.scripts.map((script) => script.path) ?? [];
  return new Set(
    firstPaths.filter((path) =>
      otherPages.every((page) => page.scripts.some((script) => script.path === path)),
    ),
  );
}

function pageProblems(page: PageScripts, sharedPaths: Set<string>, budget: Budget): string[] {
  const problems: string[] = [];
  const total = totalBytes(page.scripts);
  if (total > budget.totalKilobytes * BYTES_PER_KILOBYTE) {
    problems.push(
      `${page.route} loads ${kilobytes(total)} KB of JavaScript (budget ${String(budget.totalKilobytes)} KB)`,
    );
  }
  const ownBytes = totalBytes(page.scripts.filter((script) => !sharedPaths.has(script.path)));
  if (ownBytes > budget.routeSpecificKilobytes * BYTES_PER_KILOBYTE) {
    problems.push(
      `${page.route} has ${kilobytes(ownBytes)} KB of its own JavaScript (budget ${String(budget.routeSpecificKilobytes)} KB)`,
    );
  }
  return problems;
}

export function budgetProblems(pages: readonly PageScripts[], budget: Budget): string[] {
  const sharedPaths = sharedScriptPaths(pages);
  return pages.flatMap((page) => pageProblems(page, sharedPaths, budget));
}
