import { describe, expect, it } from 'vitest';
import {
  calendarDateSchema,
  displayNameSchema,
  emailSchema,
  idempotencyKeySchema,
  instantSchema,
  recordIdSchema,
  timeZoneSchema,
  versionSchema,
} from './primitives';
import { fieldErrorsFor } from './test-support';

describe('recordIdSchema', () => {
  it('accepts random ids', () => {
    expect(recordIdSchema.parse('a1B2_c3-D4')).toBe('a1B2_c3-D4');
  });

  it.each(['', 'has space', 'semi;colon', 'x'.repeat(65)])('rejects %j', (value) => {
    expect(fieldErrorsFor(recordIdSchema, value)).toEqual({ request: "That id isn't valid" });
  });
});

describe('displayNameSchema', () => {
  it('trims the name', () => {
    expect(displayNameSchema.parse('  Sam  ')).toBe('Sam');
  });

  it('needs at least one character that is not a space', () => {
    expect(fieldErrorsFor(displayNameSchema, '   ')).toEqual({ request: 'Enter a name' });
  });

  it('caps the length', () => {
    expect(fieldErrorsFor(displayNameSchema, 'x'.repeat(51))).toEqual({
      request: 'Keep it to 50 characters',
    });
  });

  it('says when it is not text', () => {
    expect(fieldErrorsFor(displayNameSchema, 42)).toEqual({
      request: 'Invalid input: expected string, received number',
    });
  });
});

describe('emailSchema', () => {
  it('trims and lower-cases an email address', () => {
    expect(emailSchema.parse(' Sam@Example.COM ')).toBe('sam@example.com');
  });

  it('rejects something that is not an email address', () => {
    expect(fieldErrorsFor(emailSchema, 'sam@example')).toEqual({
      request: 'Enter an email address like name@example.com',
    });
  });
});

describe('calendarDateSchema', () => {
  it('accepts a real day', () => {
    expect(calendarDateSchema.parse('2026-02-28')).toBe('2026-02-28');
  });

  it.each(['2026-02-30', '28/02/2026', '2026-2-8', 20260228])('rejects %j', (value) => {
    expect(fieldErrorsFor(calendarDateSchema, value)).toEqual({
      request: 'Use a date like 2026-11-23',
    });
  });
});

describe('instantSchema', () => {
  it('accepts a UTC timestamp', () => {
    expect(instantSchema.parse('2026-11-23T08:40:00.000Z')).toBe('2026-11-23T08:40:00.000Z');
  });

  it('rejects a time without a zone', () => {
    expect(fieldErrorsFor(instantSchema, '2026-11-23 08:40')).toEqual({
      request: 'Use a UTC time like 2026-11-23T08:40:00Z',
    });
  });
});

describe('timeZoneSchema', () => {
  it.each(['Europe/London', 'Australia/Sydney', 'UTC'])('accepts %s', (timeZone) => {
    expect(timeZoneSchema.parse(timeZone)).toBe(timeZone);
  });

  it('rejects a made-up zone', () => {
    expect(fieldErrorsFor(timeZoneSchema, 'Mars/Olympus_Mons')).toEqual({
      request: 'Pick a time zone from the list',
    });
  });
});

describe('versionSchema', () => {
  it('accepts a positive whole number', () => {
    expect(versionSchema.parse(3)).toBe(3);
  });

  it.each([0, 1.5, -1])('rejects %d', (value) => {
    expect(Object.keys(fieldErrorsFor(versionSchema, value))).toEqual(['request']);
  });
});

describe('idempotencyKeySchema', () => {
  it('accepts a UUID', () => {
    const key = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';
    expect(idempotencyKeySchema.parse(key)).toBe(key);
  });

  it('rejects anything shorter than 16 characters', () => {
    expect(fieldErrorsFor(idempotencyKeySchema, 'short')).toEqual({
      request: "That request key isn't valid",
    });
  });
});
