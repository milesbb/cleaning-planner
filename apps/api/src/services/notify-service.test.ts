import type { AgendaQuery, AgendaResponse } from '@cleaning-planner/contracts/agenda';
import type { Household } from '@cleaning-planner/contracts/household';
import type { Job } from '@cleaning-planner/contracts/job';
import type { ReminderMessage } from '@cleaning-planner/contracts/reminder-message';
import type { ReminderSettings } from '@cleaning-planner/contracts/reminders';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describe, expect, it, vi } from 'vitest';
import { createNotifyService } from './notify-service';
import type { NotifyDependencies, PushOutcome, WebPushDevice } from './notify-service';
import type { PushDeviceRecord } from './push-device-service';

const NOW = '2026-11-24T07:00:00.000Z';

const SETTINGS: ReminderSettings = {
  timeZone: 'Europe/London',
  daily: { isOn: true, time: '07:00' },
  weekly: { isOn: false, day: 'monday', time: '08:00' },
  onlyMyJobs: false,
  alsoByEmail: false,
};

const HOME: Household = {
  id: 'home-1',
  name: 'Our flat',
  timeZone: 'Europe/London',
  weekStartsOn: 'monday',
  ownerId: 'user-sam',
  version: 1,
};

const HOB: Job = {
  id: 'job-hob',
  roomId: 'room-kitchen',
  libraryId: null,
  name: 'Wipe the hob',
  icon: 'spray',
  schedule: { type: 'floating', every: { value: 1, unit: 'day' } },
  startDate: parseCalendarDate('2026-11-01'),
  assignment: { kind: 'anyone' },
  snooze: null,
  effortMinutes: 5,
  version: 1,
};

const TODAY = parseCalendarDate('2026-11-24');

const TODAY_AGENDA: AgendaResponse = {
  late: [],
  days: [
    {
      date: TODAY,
      due: [{ jobId: 'job-hob', dueDate: TODAY, status: 'today', assignee: null }],
      done: [],
    },
  ],
};

function browser(id: string): PushDeviceRecord {
  return {
    id,
    addedAt: '2026-11-20T08:00:00.000Z',
    kind: 'webPush',
    subscription: {
      endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
      keys: { p256dh: 'BPublicKey', auth: 'authSecret' },
    },
  };
}

const APP: PushDeviceRecord = {
  id: 'device-app',
  addedAt: '2026-11-20T08:00:00.000Z',
  kind: 'fcm',
  platform: 'ios',
  token: 'fcm-token',
};

interface Fakes extends NotifyDependencies {
  sent: { deviceId: string; title: string }[];
}

function fakes(overrides: Partial<NotifyDependencies> = {}): Fakes {
  const sent: Fakes['sent'] = [];
  const ourFlat = { id: 'home-1', name: 'Our flat', role: 'member' as const };
  return {
    sent,
    reminders: { getSettings: vi.fn(() => Promise.resolve(SETTINGS)) },
    homes: { listHomesOf: vi.fn(() => Promise.resolve([ourFlat])) },
    households: { getHousehold: vi.fn(() => Promise.resolve(HOME)) },
    jobs: { listJobs: vi.fn(() => Promise.resolve([HOB])) },
    agenda: {
      getAgenda: vi.fn((_householdId: string, _query: AgendaQuery) =>
        Promise.resolve(TODAY_AGENDA),
      ),
    },
    devices: {
      listDevices: vi.fn(() => Promise.resolve([browser('device-1'), browser('device-2'), APP])),
      removeDevice: vi.fn(() => Promise.resolve()),
    },
    sender: {
      sendWebPush: vi.fn(
        (device: WebPushDevice, message: ReminderMessage): Promise<PushOutcome> => {
          sent.push({ deviceId: device.id, title: message.title });
          return Promise.resolve('sent');
        },
      ),
    },
    now: () => NOW,
    ...overrides,
  };
}

function settingsWith(changes: Partial<ReminderSettings>): NotifyDependencies['reminders'] {
  return { getSettings: () => Promise.resolve({ ...SETTINGS, ...changes }) };
}

describe('sendReminder', () => {
  it('sends the day’s jobs to every browser', async () => {
    const dependencies = fakes();
    const summary = await createNotifyService(dependencies).sendReminder({
      userId: 'user-sam',
      reminder: 'daily',
    });
    expect(dependencies.sent).toEqual([
      { deviceId: 'device-1', title: '1 job today' },
      { deviceId: 'device-2', title: '1 job today' },
    ]);
    expect(dependencies.agenda.getAgenda).toHaveBeenCalledWith('home-1', {
      from: '2026-11-24',
      to: '2026-11-24',
    });
    expect(summary).toEqual({ sent: 2, removed: 0, failed: 0 });
  });

  it('covers the next seven days for the weekly reminder', async () => {
    const dependencies = fakes({
      reminders: settingsWith({ weekly: { isOn: true, day: 'tuesday', time: '08:00' } }),
    });
    await createNotifyService(dependencies).sendReminder({
      userId: 'user-sam',
      reminder: 'weekly',
    });
    expect(dependencies.agenda.getAgenda).toHaveBeenCalledWith('home-1', {
      from: '2026-11-24',
      to: '2026-11-30',
    });
    expect(dependencies.sent[0]?.title).toBe('1 job this week');
  });

  it('only asks for your own jobs when you chose that', async () => {
    const dependencies = fakes({ reminders: settingsWith({ onlyMyJobs: true }) });
    await createNotifyService(dependencies).sendReminder({ userId: 'user-sam', reminder: 'daily' });
    expect(dependencies.agenda.getAgenda).toHaveBeenCalledWith('home-1', {
      from: '2026-11-24',
      to: '2026-11-24',
      person: 'user-sam',
    });
  });

  it('sends nothing on a day with nothing due', async () => {
    const dependencies = fakes({
      agenda: { getAgenda: () => Promise.resolve({ late: [], days: [] }) },
    });
    const summary = await createNotifyService(dependencies).sendReminder({
      userId: 'user-sam',
      reminder: 'daily',
    });
    expect(dependencies.sent).toEqual([]);
    expect(summary).toEqual({ sent: 0, removed: 0, failed: 0 });
  });

  it('sends nothing for a reminder that has been turned off', async () => {
    const dependencies = fakes();
    await createNotifyService(dependencies).sendReminder({
      userId: 'user-sam',
      reminder: 'weekly',
    });
    expect(dependencies.sent).toEqual([]);
    expect(dependencies.devices.listDevices).not.toHaveBeenCalled();
  });

  it('sends a test reminder whatever is due', async () => {
    const dependencies = fakes({ reminders: { getSettings: () => Promise.resolve(null) } });
    await createNotifyService(dependencies).sendReminder({ userId: 'user-sam', reminder: 'test' });
    expect(dependencies.sent.map((entry) => entry.title)).toEqual([
      'Reminders are on',
      'Reminders are on',
    ]);
    expect(dependencies.agenda.getAgenda).not.toHaveBeenCalled();
  });

  it('forgets a browser its push service says is gone', async () => {
    const dependencies = fakes();
    vi.mocked(dependencies.sender.sendWebPush).mockResolvedValueOnce('gone');
    const summary = await createNotifyService(dependencies).sendReminder({
      userId: 'user-sam',
      reminder: 'daily',
    });
    expect(dependencies.devices.removeDevice).toHaveBeenCalledWith('user-sam', 'device-1');
    expect(summary).toEqual({ sent: 1, removed: 1, failed: 0 });
  });

  it('keeps going when one browser fails', async () => {
    const dependencies = fakes();
    vi.mocked(dependencies.sender.sendWebPush).mockRejectedValueOnce(new Error('Push down'));
    const summary = await createNotifyService(dependencies).sendReminder({
      userId: 'user-sam',
      reminder: 'daily',
    });
    expect(summary).toEqual({ sent: 1, removed: 0, failed: 1 });
  });

  it('fails the run when no browser could be reached, so the schedule tries again', async () => {
    const dependencies = fakes();
    vi.mocked(dependencies.sender.sendWebPush).mockRejectedValue(new Error('Offline'));
    await expect(
      createNotifyService(dependencies).sendReminder({ userId: 'user-sam', reminder: 'daily' }),
    ).rejects.toThrow('No reminder could be sent');
  });
});
