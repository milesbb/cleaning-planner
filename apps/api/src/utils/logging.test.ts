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
