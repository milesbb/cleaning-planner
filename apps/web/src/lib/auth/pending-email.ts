import { tabValue } from '../storage/stored-value';

// The email a sign-up or password-reset code was sent to.
const pending = tabValue('cleaning-planner.pending-email');

export const rememberPendingEmail = pending.remember;
export const pendingEmail = pending.read;
export const forgetPendingEmail = pending.forget;
