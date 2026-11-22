import { INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH } from '@cleaning-planner/contracts/invite';
import { randomInt } from 'node:crypto';

type RandomIndex = (range: number) => number;

export function generateInviteCode(randomIndex: RandomIndex = randomInt): string {
  return Array.from({ length: INVITE_CODE_LENGTH }, () =>
    INVITE_CODE_ALPHABET.charAt(randomIndex(INVITE_CODE_ALPHABET.length)),
  ).join('');
}
