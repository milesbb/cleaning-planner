import { sessionValue } from '../storage/session-value';

// The invite someone opened before signing up or logging in, so the start
// screen can bring them back to it afterwards.
const pending = sessionValue('cleaning-planner.pending-invite');

export const rememberPendingInvite = pending.remember;
export const pendingInvite = pending.read;
export const forgetPendingInvite = pending.forget;
