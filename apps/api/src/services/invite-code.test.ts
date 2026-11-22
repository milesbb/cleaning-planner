import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  inviteCodeSchema,
} from '@cleaning-planner/contracts/invite';
import { describe, expect, it } from 'vitest';
import { generateInviteCode } from './invite-code';

const SAMPLES = 2000;

describe('generateInviteCode', () => {
  it('makes codes the invite contract accepts', () => {
    for (let sample = 0; sample < SAMPLES; sample += 1) {
      expect(inviteCodeSchema.safeParse(generateInviteCode()).success).toBe(true);
    }
  });

  it('never uses letters that look like numbers', () => {
    const codes = Array.from({ length: SAMPLES }, () => generateInviteCode()).join('');
    expect(codes).not.toMatch(/[ILOU]/);
    expect(codes).toHaveLength(SAMPLES * INVITE_CODE_LENGTH);
  });

  it('uses every character of the alphabet', () => {
    const used = new Set(Array.from({ length: SAMPLES }, () => generateInviteCode()).join(''));
    expect(used.size).toBe(INVITE_CODE_ALPHABET.length);
  });

  it('picks each character with the random source it is given', () => {
    let next = 0;
    const code = generateInviteCode((range) => next++ % range);
    expect(code).toBe(INVITE_CODE_ALPHABET.slice(0, INVITE_CODE_LENGTH));
  });
});
