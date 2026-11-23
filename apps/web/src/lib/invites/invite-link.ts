import { APP_NAME } from '../app-identity';
import { joinPathFor } from '../navigation/start-route';

const HALF_A_CODE = 4;

export function inviteLinkFor(origin: string, inviteCode: string): string {
  return new URL(joinPathFor(inviteCode), origin).href;
}

// "7K3M 9QZA": easier to read out or type from another screen.
export function groupedInviteCode(inviteCode: string): string {
  return `${inviteCode.slice(0, HALF_A_CODE)} ${inviteCode.slice(HALF_A_CODE)}`;
}

export function inviteMessageFor(homeName: string, inviteCode: string): string {
  return `Join ${homeName} on ${APP_NAME}. Your code is ${inviteCode}.`;
}
