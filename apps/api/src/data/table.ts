import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export interface Table {
  client: DynamoDBDocumentClient;
  name: string;
}

interface TableEnvironment {
  TABLE_NAME?: string | undefined;
  DYNAMODB_ENDPOINT?: string | undefined;
}

const LOCAL_CONNECTION = {
  region: 'local',
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
};

export const Keys = {
  household: (householdId: string): string => `HOUSEHOLD#${householdId}`,
  user: (userId: string): string => `USER#${userId}`,
  member: (userId: string): string => `MEMBER#${userId}`,
  profile: 'PROFILE',
  meta: 'META',
  memberPrefix: 'MEMBER#',
  jobPrefix: 'JOB#',
  roomPrefix: 'ROOM#',
  donePrefix: (jobId: string): string => `DONE#${jobId}#`,
  currentInvite: 'INVITE',
  invite: (code: string): string => `INVITE#${code}`,
  attempts: (guardKey: string): string => `ATTEMPTS#${guardKey}`,
  room: (roomId: string): string => `ROOM#${roomId}`,
  job: (jobId: string): string => `JOB#${jobId}`,
  homesOfUser: 'HOUSEHOLD#',
} as const;

export function createDynamoClient(endpoint: string | undefined): DynamoDBClient {
  return new DynamoDBClient(endpoint === undefined ? {} : { endpoint, ...LOCAL_CONNECTION });
}

export function connectToTable(environment: TableEnvironment): Table {
  const name = environment.TABLE_NAME;
  if (name === undefined || name === '') throw new Error('TABLE_NAME is not set');
  const client = createDynamoClient(environment.DYNAMODB_ENDPOINT);
  return {
    client: DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    }),
    name,
  };
}
