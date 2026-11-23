import { sessionValue } from '../storage/session-value';

// The email a sign-up or password-reset code was sent to.
const pending = sessionValue('cleaning-planner.pending-email');

export const rememberPendingEmail = pending.remember;
export const pendingEmail = pending.read;
export const forgetPendingEmail = pending.forget;
