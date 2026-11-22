// The email a sign-up or password-reset code was sent to, carried from one
// screen to the next. Session storage keeps it in this tab only and out of URLs.
const KEY = 'cleaning-planner.pending-email';

export function rememberPendingEmail(email: string): void {
  try {
    window.sessionStorage.setItem(KEY, email);
  } catch {
    // Storage blocked: the next screen asks for the email instead.
  }
}

export function pendingEmail(): string | null {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function forgetPendingEmail(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to forget.
  }
}
