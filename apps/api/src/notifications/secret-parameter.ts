import { GetParameterCommand } from '@aws-sdk/client-ssm';

interface SsmClient {
  send: (command: GetParameterCommand) => Promise<{ Parameter?: { Value?: string } }>;
}

async function readSecret(client: SsmClient, name: string): Promise<string> {
  const { Parameter } = await client.send(
    new GetParameterCommand({ Name: name, WithDecryption: true }),
  );
  if (Parameter?.Value === undefined) throw new Error(`SSM parameter ${name} has no value`);
  return Parameter.Value;
}

// Read once per Lambda container; a failed read is tried again next time.
export function cachedSecretParameter(client: SsmClient, name: string): () => Promise<string> {
  let reading: Promise<string> | null = null;
  return () => {
    reading ??= readSecret(client, name).catch((error: unknown) => {
      reading = null;
      throw error;
    });
    return reading;
  };
}
