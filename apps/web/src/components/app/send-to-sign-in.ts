import type { AccountAuth } from '@/lib/auth/account-auth';
import { signInPathFor } from '@/lib/navigation/start-route';

// The API no longer accepts this device's session, so forget it here first:
// Log in sends anyone still signed in straight back, which would loop. If even
// forgetting it fails, Log in is still the right place to go, and logging in
// replaces the session anyway.
export async function sendToSignIn(
  auth: Pick<AccountAuth, 'signOut'>,
  goTo: (path: string) => void,
  currentPath: string,
): Promise<void> {
  await auth.signOut().catch(() => undefined);
  goTo(signInPathFor(currentPath));
}
