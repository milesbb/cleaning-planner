import { describe, expect, it } from 'vitest';
import { groupedInviteCode, inviteLinkFor, inviteMessageFor } from './invite-link';

describe('invite links', () => {
  it('links to the join screen on this site', () => {
    expect(inviteLinkFor('https://planner.example', '7K3M9QZA')).toBe(
      'https://planner.example/join?code=7K3M9QZA',
    );
  });

  it('shows the code in two easy-to-read halves', () => {
    expect(groupedInviteCode('7K3M9QZA')).toBe('7K3M 9QZA');
  });

  it('words the message for the share sheet', () => {
    expect(inviteMessageFor('Our flat', '7K3M9QZA')).toBe(
      'Join Our flat on Cleaning Planner. Your code is 7K3M9QZA.',
    );
  });
});
