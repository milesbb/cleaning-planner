import { describe, expect, it } from 'vitest';
import { safeReturnPath, signInPathFor, startRouteFor } from './start-route';

describe('startRouteFor', () => {
  it('sends someone signed out to the welcome screen', () => {
    expect(startRouteFor({ isSignedIn: false, homeCount: 0 })).toBe('/welcome');
  });

  it('sends someone without a home to start one', () => {
    expect(startRouteFor({ isSignedIn: true, homeCount: 0 })).toBe('/homes/new');
  });

  it('sends everyone else to today', () => {
    expect(startRouteFor({ isSignedIn: true, homeCount: 2 })).toBe('/today');
  });
});

describe('signInPathFor', () => {
  it('remembers where to come back to', () => {
    expect(signInPathFor('/job?id=job-1')).toBe('/sign-in?next=%2Fjob%3Fid%3Djob-1');
  });

  it('does not bother remembering the start page', () => {
    expect(signInPathFor('/')).toBe('/sign-in');
  });
});

describe('safeReturnPath', () => {
  it('keeps a path inside the app', () => {
    expect(safeReturnPath('/job?id=job-1')).toBe('/job?id=job-1');
  });

  it.each([
    ['nothing', null],
    ['another site', 'https://evil.example/steal'],
    ['a protocol-relative address', '//evil.example'],
    ['a backslash trick', '/\\evil.example'],
    ['a script', 'javascript:alert(1)'],
    ['the sign-in page itself', '/sign-in?next=%2F'],
  ])('falls back to the start page for %s', (_description, next) => {
    expect(safeReturnPath(next)).toBe('/');
  });
});
