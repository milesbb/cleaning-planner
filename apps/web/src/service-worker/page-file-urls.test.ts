import { describe, expect, it } from 'vitest';
import { pageFileUrls } from './page-file-urls';

const ORIGIN = 'https://cleaning.example';

function pageFilesFor(path: string): string[] {
  return pageFileUrls({ url: new URL(path, ORIGIN) }).map((url) => url.href);
}

describe('pageFileUrls', () => {
  it('finds the page file for an address typed without its closing slash', () => {
    expect(pageFilesFor('/welcome')).toEqual([`${ORIGIN}/welcome/index.html`]);
  });

  it('finds the one page file for every record, whatever its id', () => {
    expect(pageFilesFor('/job?id=job-1')).toEqual([`${ORIGIN}/job/index.html`]);
  });

  it.each(['/today/', '/_next/static/chunks/main.js', '/icons/icon-192.png'])(
    'adds nothing for %s, which the precache already matches',
    (path) => {
      expect(pageFilesFor(path)).toEqual([]);
    },
  );
});
