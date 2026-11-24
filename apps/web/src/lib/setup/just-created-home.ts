import { tabValue } from '../storage/stored-value';

// "You're all set" is for the tab that has just created a home; opened any
// other time, it sends you to Today.
const justCreatedHome = tabValue('cleaning-planner.just-created-home');
const CREATED = 'yes';

export function rememberJustCreatedHome(): void {
  justCreatedHome.remember(CREATED);
}

export function hasJustCreatedHome(): boolean {
  return justCreatedHome.read() === CREATED;
}

export function forgetJustCreatedHome(): void {
  justCreatedHome.forget();
}
