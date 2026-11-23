import { describe, expect, it } from 'vitest';
import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  createInviteResponseSchema,
  inviteCodeSchema,
  invitePreviewSchema,
} from './invite';
import { describeContract, fieldErrorsFor } from './test-support';

const BITS_PER_CHARACTER = Math.log2(INVITE_CODE_ALPHABET.length);

describe('inviteCodeSchema', () => {
  it('uses an alphabet without letters that look like numbers', () => {
    expect(INVITE_CODE_ALPHABET).toHaveLength(32);
    expect(INVITE_CODE_ALPHABET).not.toMatch(/[ILOU]/);
  });

  it('is long enough to give about 40 bits of randomness', () => {
    expect(BITS_PER_CHARACTER * INVITE_CODE_LENGTH).toBe(40);
  });

  it('accepts every character of the alphabet', () => {
    for (let start = 0; start < INVITE_CODE_ALPHABET.length; start += INVITE_CODE_LENGTH) {
      const code = INVITE_CODE_ALPHABET.slice(start, start + INVITE_CODE_LENGTH);
      expect(inviteCodeSchema.parse(code)).toBe(code);
    }
  });

  it('tidies up a typed code', () => {
    expect(inviteCodeSchema.parse(' 7k3m9qza ')).toBe('7K3M9QZA');
  });

  it.each(['7K3M9QZ', '7K3M9QZAB', '7K3M9QZO', '7K3M-QZA'])('rejects %s', (code) => {
    expect(fieldErrorsFor(inviteCodeSchema, code)).toEqual({
      request: 'Enter the 8-character code from your invite',
    });
  });
});

describeContract('createInviteResponseSchema', createInviteResponseSchema, {
  valid: { code: '7K3M9QZA', expiresAt: '2026-11-30T09:00:00Z' },
  requiredField: 'expiresAt',
  wrongType: { field: 'expiresAt', value: 'next week' },
});

describeContract('invitePreviewSchema', invitePreviewSchema, {
  valid: {
    householdName: 'Our flat',
    invitedByName: 'Sam',
    memberCount: 2,
    expiresAt: '2026-11-30T09:00:00Z',
    isMember: false,
  },
  requiredField: 'isMember',
  wrongType: { field: 'memberCount', value: 0 },
});
