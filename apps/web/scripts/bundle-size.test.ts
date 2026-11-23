import { describe, expect, it } from 'vitest';
import { BUDGET, type PageScripts, budgetProblems, scriptSourcesIn } from './bundle-size.ts';

const kilobytes = (value: number): number => value * 1024;

function page(route: string, scripts: Record<string, number>): PageScripts {
  return {
    route,
    scripts: Object.entries(scripts).map(([path, size]) => ({ path, gzipBytes: kilobytes(size) })),
  };
}

describe('scriptSourcesIn', () => {
  it('lists external scripts only', () => {
    const html =
      '<head><script src="/_next/a.js" async=""></script><script>inline()</script></head><body><script defer src="/_next/b.js"></script></body>';
    expect(scriptSourcesIn(html)).toEqual(['/_next/a.js', '/_next/b.js']);
  });

  it('leaves out the legacy polyfills, which modern browsers never download', () => {
    const html =
      '<script src="/_next/polyfills.js" noModule=""></script><script src="/_next/a.js" async=""></script>';
    expect(scriptSourcesIn(html)).toEqual(['/_next/a.js']);
  });
});

describe('budgetProblems', () => {
  it('is happy when every page is within budget', () => {
    const pages = [
      page('/', { 'framework.js': 170, 'home.js': 20 }),
      page('/week/', { 'framework.js': 170, 'week.js': 40 }),
    ];
    expect(budgetProblems(pages, BUDGET)).toEqual([]);
  });

  it('reports a page whose total first load is over budget', () => {
    const pages = [
      page('/', { 'framework.js': 170, 'home.js': 20 }),
      page('/week/', { 'framework.js': 170, 'week.js': 45 }),
      page('/heavy/', { 'framework.js': 170, 'heavy.js': 59 }),
    ];
    expect(budgetProblems(pages, { totalKilobytes: 220, routeSpecificKilobytes: 60 })).toEqual([
      '/heavy/ loads 229.0 KB of JavaScript (budget 220 KB)',
    ]);
  });

  it('reports a page with too much code of its own, separately from the shared framework', () => {
    const pages = [
      page('/', { 'framework.js': 100, 'home.js': 5 }),
      page('/job/', { 'framework.js': 100, 'job.js': 61 }),
    ];
    expect(budgetProblems(pages, BUDGET)).toEqual([
      '/job/ has 61.0 KB of its own JavaScript (budget 60 KB)',
    ]);
  });

  it('treats scripts on every page as shared, not route-specific', () => {
    const pages = [page('/', { 'framework.js': 150 }), page('/week/', { 'framework.js': 150 })];
    expect(budgetProblems(pages, BUDGET)).toEqual([]);
  });

  it('checks a single page against the total budget only', () => {
    expect(budgetProblems([page('/', { 'framework.js': 230 })], BUDGET)).toEqual([
      '/ loads 230.0 KB of JavaScript (budget 220 KB)',
    ]);
  });
});
