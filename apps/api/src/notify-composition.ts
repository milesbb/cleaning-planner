import { SSMClient } from '@aws-sdk/client-ssm';
import webPush from 'web-push';
import { createHouseholdRepository } from './data/household-repository';
import { createJobRepository } from './data/job-repository';
import { createMemberRepository } from './data/member-repository';
import { createMembershipRepository } from './data/membership-repository';
import { createProgressRepository } from './data/progress-repository';
import { createPushDeviceRepository } from './data/push-device-repository';
import { createReminderRepository } from './data/reminder-repository';
import { connectToTable } from './data/table';
import { readNotifyEnvironment } from './notifications/notify-environment';
import { cachedSecretParameter } from './notifications/secret-parameter';
import { createWebPushSender } from './notifications/web-push-sender';
import type { VapidDetails } from './notifications/web-push-sender';
import { createAgendaService } from './services/agenda-service';
import { createNotifyService } from './services/notify-service';
import type { NotifyService } from './services/notify-service';

function vapidDetailsFrom(environment: NodeJS.ProcessEnv): () => Promise<VapidDetails> {
  const { vapidPrivateKeyParameter, vapidPublicKey, vapidSubject } =
    readNotifyEnvironment(environment);
  const readPrivateKey = cachedSecretParameter(new SSMClient({}), vapidPrivateKeyParameter);
  return async () => ({
    subject: vapidSubject,
    publicKey: vapidPublicKey,
    privateKey: await readPrivateKey(),
  });
}

// The notify function's services: the same repositories and agenda as the API.
export function createNotify(environment: NodeJS.ProcessEnv): NotifyService {
  const table = connectToTable(environment);
  const now = (): string => new Date().toISOString();
  const households = createHouseholdRepository(table);
  const jobs = createJobRepository(table);
  return createNotifyService({
    reminders: createReminderRepository(table),
    homes: createMembershipRepository(table),
    households,
    jobs,
    agenda: createAgendaService({
      households,
      jobs,
      members: createMemberRepository(table),
      completions: createProgressRepository(table),
      now,
    }),
    devices: createPushDeviceRepository(table),
    sender: createWebPushSender({
      sendNotification: webPush.sendNotification,
      loadVapidDetails: vapidDetailsFrom(environment),
    }),
    now,
  });
}
