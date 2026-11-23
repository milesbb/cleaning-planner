import type { AgendaQuery } from '@cleaning-planner/contracts/agenda';
import type { HouseholdSummary } from '@cleaning-planner/contracts/household';
import type { ReminderMessage } from '@cleaning-planner/contracts/reminder-message';
import type { ReminderEvent, ReminderSettings } from '@cleaning-planner/contracts/reminders';
import { addInterval } from '@cleaning-planner/schedule/calendar-date';
import { calendarDateInTimeZone } from '@cleaning-planner/schedule/time-zone';
import { logger } from '../utils/logging';
import type { AgendaService } from './agenda-service';
import type { HouseholdStore } from './household-service';
import type { JobStore } from './job-service';
import type { PushDeviceRecord } from './push-device-service';
import { reminderMessageFor } from './reminder-content';
import type { HomeReminderSource } from './reminder-content';
import type { ReminderStore } from './reminder-service';

const DAYS_AFTER_TODAY_IN_A_WEEK = 6;

export type PushOutcome = 'sent' | 'gone';
export type WebPushDevice = Extract<PushDeviceRecord, { kind: 'webPush' }>;

export interface PushSender {
  // 'gone' when the push service says the subscription no longer exists.
  sendWebPush: (device: WebPushDevice, message: ReminderMessage) => Promise<PushOutcome>;
}

export interface NotifyDevices {
  listDevices: (userId: string) => Promise<PushDeviceRecord[]>;
  removeDevice: (userId: string, deviceId: string) => Promise<void>;
}

export interface NotifyDependencies {
  reminders: Pick<ReminderStore, 'getSettings'>;
  homes: { listHomesOf: (userId: string) => Promise<HouseholdSummary[]> };
  households: Pick<HouseholdStore, 'getHousehold'>;
  jobs: Pick<JobStore, 'listJobs'>;
  agenda: Pick<AgendaService, 'getAgenda'>;
  devices: NotifyDevices;
  sender: PushSender;
  now: () => string;
}

export interface NotifySummary {
  sent: number;
  removed: number;
  failed: number;
}

export interface NotifyService {
  sendReminder: (event: ReminderEvent) => Promise<NotifySummary>;
}

const NOTHING_SENT: NotifySummary = { sent: 0, removed: 0, failed: 0 };

function isTurnedOn(event: ReminderEvent, settings: ReminderSettings | null): boolean {
  if (event.reminder === 'test') return true;
  return settings?.[event.reminder].isOn ?? false;
}

function agendaQueryFor(
  event: ReminderEvent,
  settings: ReminderSettings | null,
  today: ReturnType<typeof calendarDateInTimeZone>,
): AgendaQuery {
  const days = event.reminder === 'weekly' ? DAYS_AFTER_TODAY_IN_A_WEEK : 0;
  const to = addInterval(today, { value: days, unit: 'day' });
  return {
    from: today,
    to,
    ...(settings?.onlyMyJobs === true ? { person: event.userId } : {}),
  };
}

async function homeSource(
  dependencies: NotifyDependencies,
  home: HouseholdSummary,
  query: (today: ReturnType<typeof calendarDateInTimeZone>) => AgendaQuery,
): Promise<HomeReminderSource | null> {
  const household = await dependencies.households.getHousehold(home.id);
  if (household === null) return null;
  const today = calendarDateInTimeZone(dependencies.now(), household.timeZone);
  const [agenda, jobs] = await Promise.all([
    dependencies.agenda.getAgenda(home.id, query(today)),
    dependencies.jobs.listJobs(home.id),
  ]);
  return { agenda, jobNames: new Map(jobs.map((job) => [job.id, job.name])) };
}

// Each of the person's homes, read as of today in that home's time zone.
async function homeSources(
  dependencies: NotifyDependencies,
  event: ReminderEvent,
  settings: ReminderSettings | null,
): Promise<HomeReminderSource[]> {
  if (event.reminder === 'test') return [];
  const homes = await dependencies.homes.listHomesOf(event.userId);
  const sources = await Promise.all(
    homes.map((home) =>
      homeSource(dependencies, home, (today) => agendaQueryFor(event, settings, today)),
    ),
  );
  return sources.filter((source) => source !== null);
}

async function sendToDevice(
  dependencies: NotifyDependencies,
  userId: string,
  device: WebPushDevice,
  message: ReminderMessage,
): Promise<keyof NotifySummary> {
  try {
    if ((await dependencies.sender.sendWebPush(device, message)) === 'sent') return 'sent';
    await dependencies.devices.removeDevice(userId, device.id);
    return 'removed';
  } catch (error) {
    logger.warn('Couldn’t send a reminder to a device', {
      deviceId: device.id,
      reason: error instanceof Error ? error.message : 'unknown',
    });
    return 'failed';
  }
}

function isWebPush(device: PushDeviceRecord): device is WebPushDevice {
  return device.kind === 'webPush';
}

// App devices (FCM) get their reminders once #233 lands.
async function sendToDevices(
  dependencies: NotifyDependencies,
  userId: string,
  message: ReminderMessage,
): Promise<NotifySummary> {
  const devices = (await dependencies.devices.listDevices(userId)).filter(isWebPush);
  const outcomes = await Promise.all(
    devices.map((device) => sendToDevice(dependencies, userId, device, message)),
  );
  const summary = { ...NOTHING_SENT };
  for (const outcome of outcomes) summary[outcome] += 1;
  return summary;
}

// Failing the run lets the schedule retry; it only does that when nothing
// arrived, so a retry never sends anyone the same reminder twice.
async function sendReminder(
  dependencies: NotifyDependencies,
  event: ReminderEvent,
): Promise<NotifySummary> {
  const settings = await dependencies.reminders.getSettings(event.userId);
  if (!isTurnedOn(event, settings)) return NOTHING_SENT;
  const sources = await homeSources(dependencies, event, settings);
  const message = reminderMessageFor(event.reminder, sources);
  if (message === null) return NOTHING_SENT;
  const summary = await sendToDevices(dependencies, event.userId, message);
  if (summary.failed > 0 && summary.sent === 0) throw new Error('No reminder could be sent');
  return summary;
}

export function createNotifyService(dependencies: NotifyDependencies): NotifyService {
  return { sendReminder: (event) => sendReminder(dependencies, event) };
}
