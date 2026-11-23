import { describe, expect, it } from 'vitest';
import { joinPathFor, safeReturnPath, signInPathFor, startRouteFor } from './start-route';

describe('startRouteFor', () => {
  it('sends someone signed out to the welcome screen', () => {
    expect(startRouteFor({ isSignedIn: false, homeCount: 0, pendingInviteCode: null })).toBe(
      '/welcome',
    );
  });

  it('sends someone without a home to start one', () => {
    expect(startRouteFor({ isSignedIn: true, homeCount: 0, pendingInviteCode: null })).toBe(
      '/homes/new',
    );
  });

  it('brings someone back to the invite they opened before signing up or logging in', () => {
    expect(startRouteFor({ isSignedIn: true, homeCount: 1, pendingInviteCode: '7K3M9QZA' })).toBe(
      '/join?code=7K3M9QZA',
    );
  });

  it('keeps a pending invite until the person is signed in', () => {
    expect(startRouteFor({ isSignedIn: false, homeCount: 0, pendingInviteCode: '7K3M9QZA' })).toBe(
      '/welcome',
    );
  });

  it('sends everyone else to today', () => {
    expect(startRouteFor({ isSignedIn: true, homeCount: 2, pendingInviteCode: null })).toBe(
      '/today',
    );
  });
});

describe('joinPathFor', () => {
  it('puts the invite code in the query string, the only way a static page can read it', () => {
    expect(joinPathFor('7K3M9QZA')).toBe('/join?code=7K3M9QZA');
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
