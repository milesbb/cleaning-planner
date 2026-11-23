import type { CompletionRecord } from '@cleaning-planner/contracts/completion';
import type { Job } from '@cleaning-planner/contracts/job';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describe, expect, it, vi } from 'vitest';
import { Errors } from '../utils/errors';
import { createJobHistoryService } from './job-history-service';

const OVEN: Job = {
  id: 'job-oven',
  roomId: 'room-kitchen',
  libraryId: null,
  name: 'Clean the oven',
  icon: 'oven',
  schedule: { type: 'floating', every: { value: 1, unit: 'week' } },
  startDate: parseCalendarDate('2026-10-01'),
  assignment: { kind: 'anyone' },
  snooze: null,
  effortMinutes: 30,
  version: 1,
};

function completion(day: number): CompletionRecord {
  const date = `2026-10-${String(day).padStart(2, '0')}`;
  return {
    jobId: 'job-oven',
    outcome: day % 2 === 0 ? 'skipped' : 'done',
    completedOn: parseCalendarDate(date),
    completedBy: 'user-sam',
    doneAt: `${date}T09:00:00.000Z`,
  };
}

function serviceWith(
  history: CompletionRecord[],
  job: Job | null = OVEN,
): {
  service: ReturnType<typeof createJobHistoryService>;
  listCompletions: ReturnType<typeof vi.fn>;
} {
  const listCompletions = vi.fn(() => Promise.resolve(history));
  const service = createJobHistoryService({
    jobs: { findJob: () => Promise.resolve(job) },
    completions: { listCompletions },
  });
  return { service, listCompletions };
}

describe('listHistory', () => {
  it('lists a job’s done and skipped days, newest first', async () => {
    const { service, listCompletions } = serviceWith([
      completion(3),
      completion(10),
      completion(6),
    ]);
    const history = await service.listHistory('home-1', 'job-oven');
    expect(history.map((entry) => entry.completedOn)).toEqual([
      '2026-10-10',
      '2026-10-06',
      '2026-10-03',
    ]);
    expect(listCompletions).toHaveBeenCalledWith('home-1', 'job-oven');
  });

  it('keeps to the latest 50', async () => {
    const days = Array.from({ length: 31 }, (_, index) => completion(index + 1));
    const twoMonths = [
      ...days,
      ...days.map((entry) => ({ ...entry, doneAt: entry.doneAt.replace('-10-', '-09-') })),
    ];
    const history = await serviceWith(twoMonths).service.listHistory('home-1', 'job-oven');
    expect(history).toHaveLength(50);
    expect(history[0]?.doneAt).toBe('2026-10-31T09:00:00.000Z');
  });

  it('says so when the job has gone', async () => {
    const { service } = serviceWith([], null);
    await expect(service.listHistory('home-1', 'job-gone')).rejects.toEqual(
      Errors.notFound('No such job'),
    );
  });
});
