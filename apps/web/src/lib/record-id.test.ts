import { describe, expect, it } from 'vitest';
import { readRecordId } from './record-id';

function query(text: string): URLSearchParams {
  return new URLSearchParams(text);
}

describe('readRecordId', () => {
  it.each([
    ['?id=01JD4W8Y2K7Q3X9Z5M6N1P0R2S', '01JD4W8Y2K7Q3X9Z5M6N1P0R2S'],
    ['?id=job_abc-123', 'job_abc-123'],
    ['?code=K7Q-2MF', null],
  ])('reads %s as %s', (queryText, expected) => {
    expect(readRecordId(query(queryText))).toBe(expected);
  });

  it('reads a differently named parameter when asked', () => {
    expect(readRecordId(query('?code=K7Q-2MF'), 'code')).toBe('K7Q-2MF');
  });

  it.each([
    ['missing', ''],
    ['empty', '?id='],
    ['containing a slash', '?id=../../settings'],
    ['containing spaces', '?id=one%20two'],
    ['containing markup', '?id=%3Cscript%3E'],
    ['too long', `?id=${'a'.repeat(65)}`],
  ])('treats an id that is %s as not found', (_, queryText) => {
    expect(readRecordId(query(queryText))).toBeNull();
  });

  it('uses the first value when the parameter is repeated', () => {
    expect(readRecordId(query('?id=first&id=second'))).toBe('first');
  });
});
