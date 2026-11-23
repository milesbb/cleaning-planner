import { agendaSchema } from '@cleaning-planner/contracts/agenda';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describe, expect, it } from 'vitest';
import { moveChoices, withJobMoved } from './move-job';

const TUESDAY = parseCalendarDate('2026-11-24');
const END_OF_NEXT_WEEK = parseCalendarDate('2026-12-06');

describe('moveChoices', () => {
  it('offers every day after the due date, to the end of next week', () => {
    const choices = moveChoices({
      dueDate: parseCalendarDate('2026-11-26'),
      today: TUESDAY,
      lastDay: END_OF_NEXT_WEEK,
    });
    expect(choices[0]).toEqual({ day: '2026-11-27', label: 'Friday 27 November' });
    expect(choices.at(-1)).toEqual({ day: '2026-12-06', label: 'Sunday 6 December' });
    expect(choices).toHaveLength(10);
  });

  it('starts after today for a job that is late', () => {
    const choices = moveChoices({
      dueDate: parseCalendarDate('2026-11-20'),
      today: TUESDAY,
      lastDay: END_OF_NEXT_WEEK,
    });
    expect(choices[0]?.day).toBe('2026-11-25');
  });

  it('offers nothing when the job is due on the last day', () => {
    expect(
      moveChoices({ dueDate: END_OF_NEXT_WEEK, today: TUESDAY, lastDay: END_OF_NEXT_WEEK }),
    ).toEqual([]);
  });
});

const WEEK = agendaSchema.parse({
  late: [{ jobId: 'job-oven', dueDate: '2026-11-23', status: 'late', assignee: null }],
  days: [
    {
      date: '2026-11-23',
      due: [{ jobId: 'job-oven', dueDate: '2026-11-23', status: 'late', assignee: null }],
      done: [],
    },
    {
      date: '2026-11-24',
      due: [{ jobId: 'job-hob', dueDate: '2026-11-24', status: 'today', assignee: 'user-sam' }],
      done: [],
    },
    { date: '2026-11-25', due: [], done: [] },
  ],
});

describe('withJobMoved', () => {
  it('moves the job to its new day, keeping who it is for', () => {
    const moved = withJobMoved(WEEK, {
      jobId: 'job-hob',
      from: TUESDAY,
      until: parseCalendarDate('2026-11-25'),
    });
    expect(moved.days[1]?.due).toEqual([]);
    expect(moved.days[2]?.due).toEqual([
      { jobId: 'job-hob', dueDate: '2026-11-25', status: 'later', assignee: 'user-sam' },
    ]);
  });

  it('takes a late job off the late list too', () => {
    const moved = withJobMoved(WEEK, {
      jobId: 'job-oven',
      from: parseCalendarDate('2026-11-23'),
      until: parseCalendarDate('2026-11-25'),
    });
    expect(moved.late).toEqual([]);
    expect(moved.days[0]?.due).toEqual([]);
    expect(moved.days[2]?.due.map((item) => item.jobId)).toEqual(['job-oven']);
  });

  it('just removes the job when its new day is in a later week', () => {
    const moved = withJobMoved(WEEK, {
      jobId: 'job-hob',
      from: TUESDAY,
      until: parseCalendarDate('2026-12-02'),
    });
    expect(moved.days.flatMap((day) => day.due).map((item) => item.jobId)).toEqual(['job-oven']);
  });
});
