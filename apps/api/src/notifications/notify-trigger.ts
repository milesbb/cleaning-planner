import { InvokeCommand } from '@aws-sdk/client-lambda';
import type { ReminderTrigger } from '../services/reminder-service';

interface LambdaClient {
  send: (command: InvokeCommand) => Promise<unknown>;
}

export function createNotifyTrigger(
  client: LambdaClient,
  notifyFunctionArn: string,
): ReminderTrigger {
  return {
    sendNow: async (event): Promise<void> => {
      await client.send(
        new InvokeCommand({
          FunctionName: notifyFunctionArn,
          InvocationType: 'Event',
          Payload: new TextEncoder().encode(JSON.stringify(event)),
        }),
      );
    },
  };
}
