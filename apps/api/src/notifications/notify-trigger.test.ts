import { InvokeCommand } from '@aws-sdk/client-lambda';
import { describe, expect, it, vi } from 'vitest';
import { createNotifyTrigger } from './notify-trigger';

const NOTIFY_ARN = 'arn:aws:lambda:ap-southeast-2:123456789012:function:cleaning-planner-notify';

describe('notify trigger', () => {
  it('asks notify to send a reminder now, without waiting for it to finish', async () => {
    const send = vi.fn((_command: InvokeCommand) => Promise.resolve({ StatusCode: 202 }));
    await createNotifyTrigger({ send }, NOTIFY_ARN).sendNow({
      userId: 'user-sam',
      reminder: 'test',
    });
    const [command] = send.mock.calls[0] ?? [];
    expect(command).toBeInstanceOf(InvokeCommand);
    expect(command?.input.FunctionName).toBe(NOTIFY_ARN);
    expect(command?.input.InvocationType).toBe('Event');
    const payload = command?.input.Payload;
    expect(payload).toBeInstanceOf(Uint8Array);
    expect(payload instanceof Uint8Array ? new TextDecoder().decode(payload) : '').toBe(
      JSON.stringify({ userId: 'user-sam', reminder: 'test' }),
    );
  });

  it('passes on a failure to reach notify', async () => {
    const broken = new Error('Lambda is down');
    const send = vi.fn(() => Promise.reject(broken));
    await expect(
      createNotifyTrigger({ send }, NOTIFY_ARN).sendNow({ userId: 'user-sam', reminder: 'test' }),
    ).rejects.toBe(broken);
  });
});
