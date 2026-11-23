import type { ActivityEntry } from '@cleaning-planner/contracts/activity';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describe, expect, it, vi } from 'vitest';
import { createActivityService } from './activity-service';

const REMOVED_JOB_DONE: ActivityEntry = {
  jobId: 'job-gone',
  jobName: 'Defrost the freezer',
  outcome: 'done',
  completedOn: parseCalendarDate('2026-11-23'),
  completedBy: 'user-sam',
  doneAt: '2026-11-23T08:00:00.000Z',
};

function serviceWith(entries: ActivityEntry[] = [REMOVED_JOB_DONE]): {
  service: ReturnType<typeof createActivityService>;
  listActivity: ReturnType<typeof vi.fn>;
} {
  const listActivity = vi.fn(() => Promise.resolve(entries));
  return { service: createActivityService({ activity: { listActivity } }), listActivity };
}

describe('listActivity', () => {
  it('asks for the latest 20 entries when no limit is given', async () => {
    const { service, listActivity } = serviceWith();
    await service.listActivity('home-1', {});
    expect(listActivity).toHaveBeenCalledWith('home-1', 20);
  });

  it('asks for as many entries as the limit says', async () => {
    const { service, listActivity } = serviceWith();
    await service.listActivity('home-1', { limit: '5' });
    expect(listActivity).toHaveBeenCalledWith('home-1', 5);
  });

  it('keeps the name a job had, even once it has been removed', async () => {
    const { service } = serviceWith();
    await expect(service.listActivity('home-1', {})).resolves.toEqual([REMOVED_JOB_DONE]);
  });
});
