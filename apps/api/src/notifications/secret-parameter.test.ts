import { GetParameterCommand } from '@aws-sdk/client-ssm';
import { describe, expect, it, vi } from 'vitest';
import { cachedSecretParameter } from './secret-parameter';

const NAME = '/cleaning-planner/vapid-private-key';

describe('cachedSecretParameter', () => {
  it('reads the decrypted value once and keeps it', async () => {
    const send = vi.fn((_command: GetParameterCommand) =>
      Promise.resolve({ Parameter: { Value: 'the-secret' } }),
    );
    const read = cachedSecretParameter({ send }, NAME);
    await expect(read()).resolves.toBe('the-secret');
    await expect(read()).resolves.toBe('the-secret');
    expect(send).toHaveBeenCalledTimes(1);
    const [command] = send.mock.calls[0] ?? [];
    expect(command?.input).toEqual({ Name: NAME, WithDecryption: true });
  });

  it('fails clearly when the parameter has no value, and asks again next time', async () => {
    const send = vi
      .fn((_command: GetParameterCommand): Promise<{ Parameter?: { Value?: string } }> =>
        Promise.resolve({ Parameter: { Value: 'later' } }),
      )
      .mockResolvedValueOnce({ Parameter: {} });
    const read = cachedSecretParameter({ send }, NAME);
    await expect(read()).rejects.toThrow(`SSM parameter ${NAME} has no value`);
    await expect(read()).resolves.toBe('later');
  });
});
