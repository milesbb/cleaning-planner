export type JoinPath = `/join?code=${string}`;
export type StartRoute = '/welcome' | '/homes/new' | '/today' | JoinPath;

export interface StartState {
  isSignedIn: boolean;
  homeCount: number;
  pendingInviteCode: string | null;
}

const START_PAGE = '/';
const SIGN_IN_PAGE = '/sign-in';
const SAFE_APP_PATH = /^\/(?![/\\])/;

export function joinPathFor(inviteCode: string): JoinPath {
  return `/join?code=${encodeURIComponent(inviteCode)}`;
}

export function startRouteFor({
  isSignedIn,
  homeCount,
  pendingInviteCode,
}: StartState): StartRoute {
  if (!isSignedIn) return '/welcome';
  if (pendingInviteCode !== null) return joinPathFor(pendingInviteCode);
  return homeCount === 0 ? '/homes/new' : '/today';
}

export function signInPathFor(returnTo: string): string {
  if (returnTo === START_PAGE) return SIGN_IN_PAGE;
  return `${SIGN_IN_PAGE}?next=${encodeURIComponent(returnTo)}`;
}

export function safeReturnPath(next: string | null): string {
  if (next === null || !SAFE_APP_PATH.test(next) || next.startsWith(SIGN_IN_PAGE)) {
    return START_PAGE;
  }
  return next;
}
