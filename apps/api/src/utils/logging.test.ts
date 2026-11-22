import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from './logging';

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes info as a single JSON line for CloudWatch', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    logger.info('Started', { requestId: 'abc' });
    const [line] = write.mock.calls[0] ?? [];
    expect(JSON.parse(String(line))).toMatchObject({
      level: 'info',
      message: 'Started',
      requestId: 'abc',
    });
  });

  it('writes errors to stderr', () => {
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    logger.error('Failed');
    const [line] = write.mock.calls[0] ?? [];
    expect(JSON.parse(String(line))).toMatchObject({ level: 'error', message: 'Failed' });
  });
});
