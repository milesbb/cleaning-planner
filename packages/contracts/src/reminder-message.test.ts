import { describe, expect, it } from 'vitest';
import { reminderMessageSchema } from './reminder-message';
import { describeContract } from './test-support';

describeContract('reminderMessageSchema', reminderMessageSchema, {
  valid: { title: '3 jobs today', body: 'Wipe the hob, Clean the oven and 1 more', url: '/today/' },
  requiredField: 'title',
  wrongType: { field: 'body', value: 7 },
});

describe('reminderMessageSchema', () => {
  it('needs a title, and keeps the title and body short', () => {
    expect(reminderMessageSchema.safeParse({ title: '', body: '' }).success).toBe(false);
    expect(reminderMessageSchema.safeParse({ title: 'x'.repeat(201), body: '' }).success).toBe(
      false,
    );
    expect(reminderMessageSchema.safeParse({ title: 'Hi', body: 'x'.repeat(501) }).success).toBe(
      false,
    );
  });

  it.each(['https://example.com/', '//example.com/', 'today'])(
    'only opens a page of this site, never %s',
    (url) => {
      expect(reminderMessageSchema.safeParse({ title: 'Hi', body: '', url }).success).toBe(false);
    },
  );
});
