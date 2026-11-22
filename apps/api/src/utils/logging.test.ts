import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from './logging';

function firstLineWrittenBy(writeSpy: { mock: { calls: unknown[][] } }): unknown {
  const [line] = writeSpy.mock.calls[0] ?? [];
  return JSON.parse(String(line));
}

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes info as a single JSON line to stdout for CloudWatch', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    logger.info('Started', { requestId: 'abc' });
    expect(firstLineWrittenBy(stdoutSpy)).toMatchObject({
      level: 'info',
      message: 'Started',
      requestId: 'abc',
    });
  });

  it('writes warnings to stdout', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    logger.warn('Slow request');
    expect(firstLineWrittenBy(stdoutSpy)).toMatchObject({ level: 'warn', message: 'Slow request' });
  });

  it('writes errors to stderr', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    logger.error('Failed');
    expect(firstLineWrittenBy(stderrSpy)).toMatchObject({ level: 'error', message: 'Failed' });
  });
});

describe('logger redaction', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function loggedContext(context: Record<string, string | number | boolean>): unknown {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    logger.info('Something happened', context);
    return firstLineWrittenBy(stdoutSpy);
  }

  it('never writes email addresses, wherever they appear', () => {
    expect(
      loggedContext({ email: 'sam@example.com', note: 'invited alex@example.org' }),
    ).toMatchObject({
      email: '[redacted]',
      note: 'invited [redacted email]',
    });
  });

  it('never writes tokens or authorisation headers', () => {
    const jwt = [{ alg: 'RS256' }, { sub: 'user-1' }, 'not-a-real-signature']
      .map((part) => Buffer.from(JSON.stringify(part)).toString('base64url'))
      .join('.');
    expect(
      loggedContext({ authorization: `Bearer ${jwt}`, idToken: jwt, detail: `token ${jwt}` }),
    ).toMatchObject({
      authorization: '[redacted]',
      idToken: '[redacted]',
      detail: 'token [redacted token]',
    });
  });

  it('never writes invite codes or passwords', () => {
    expect(loggedContext({ inviteCode: '7K3M9QZA', password: 'hunter2hunter2' })).toMatchObject({
      inviteCode: '[redacted]',
      password: '[redacted]',
    });
  });

  it('keeps everything else as it was', () => {
    expect(loggedContext({ householdId: 'home-1', statusCode: 403, isRetry: false })).toMatchObject(
      { householdId: 'home-1', statusCode: 403, isRetry: false },
    );
  });
});
