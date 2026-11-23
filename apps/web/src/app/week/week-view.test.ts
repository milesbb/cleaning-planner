import { agendaSchema } from '@cleaning-planner/contracts/agenda';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describe, expect, it } from 'vitest';
import { TODAY_FIXTURE } from '../today/today-fixture';
import { buildWeekView, weekRange, weekTitle } from './week-view';

const TUESDAY = parseCalendarDate('2026-11-24');

const WEEK_AGENDA = agendaSchema.parse({
  late: [{ jobId: 'job-oven', dueDate: '2026-11-22', status: 'late', assignee: null }],
  days: [
    {
      date: '2026-11-23',
      due: [{ jobId: 'job-hob', dueDate: '2026-11-23', status: 'late', assignee: null }],
      done: [{ jobId: 'job-bins', completedOn: '2026-11-23', completedBy: 'user-sam' }],
    },
    {
      date: '2026-11-24',
      due: [{ jobId: 'job-vacuum', dueDate: '2026-11-24', status: 'today', assignee: null }],
      done: [],
    },
    {
      date: '2026-11-25',
      due: [
        { jobId: 'job-bed', dueDate: '2026-11-25', status: 'tomorrow', assignee: null },
        { jobId: 'job-deleted', dueDate: '2026-11-25', status: 'tomorrow', assignee: null },
      ],
      done: [],
    },
    { date: '2026-11-26', due: [], done: [] },
    { date: '2026-11-27', due: [], done: [] },
    { date: '2026-11-28', due: [], done: [] },
    { date: '2026-11-29', due: [], done: [] },
  ],
});

describe('weekRange', () => {
  it('follows the home’s week start', () => {
    expect(weekRange(TUESDAY, 'monday', 0)).toEqual({ from: '2026-11-23', to: '2026-11-29' });
    expect(weekRange(TUESDAY, 'sunday', 0)).toEqual({ from: '2026-11-22', to: '2026-11-28' });
  });

  it('moves a whole week back or forward', () => {
    expect(weekRange(TUESDAY, 'monday', -1)).toEqual({ from: '2026-11-16', to: '2026-11-22' });
    expect(weekRange(TUESDAY, 'monday', 2)).toEqual({ from: '2026-12-07', to: '2026-12-13' });
  });
});

describe('weekTitle', () => {
  it.each([
    [0, 'This week'],
    [1, 'Next week'],
    [-1, 'Last week'],
    [3, 'Week of 14 December'],
  ])('calls week %i “%s”', (offset, expected) => {
    expect(weekTitle(offset, weekRange(TUESDAY, 'monday', offset).from)).toBe(expected);
  });
});

describe('buildWeekView', () => {
  const view = buildWeekView({
    agenda: WEEK_AGENDA,
    jobs: TODAY_FIXTURE.jobs,
    today: TUESDAY,
  });

  it('has a row for every day, with today marked', () => {
    expect(view.days.map((day) => `${day.weekday} ${String(day.dayOfMonth)}`)).toEqual([
      'Mon 23',
      'Tue 24',
      'Wed 25',
      'Thu 26',
      'Fri 27',
      'Sat 28',
      'Sun 29',
    ]);
    expect(view.days.filter((day) => day.isToday).map((day) => day.date)).toEqual(['2026-11-24']);
  });

  it('shows each day’s jobs as done, late or to do', () => {
    expect(view.days[0]?.jobs).toEqual([
      { name: 'Empty the bins', icon: 'bins', state: 'done', effortMinutes: 5 },
      { name: 'Wipe the hob', icon: 'spray', state: 'late', effortMinutes: 5 },
    ]);
    expect(view.days[1]?.jobs).toEqual([
      { name: 'Vacuum the living room', icon: 'vacuum', state: 'toDo', effortMinutes: 15 },
    ]);
  });

  it('skips jobs that were deleted', () => {
    expect(view.days[2]?.jobs.map((job) => job.name)).toEqual(['Change the bed']);
  });

  it('adds up the week’s progress', () => {
    expect(view.progress).toEqual({ done: 1, total: 4 });
  });
});
