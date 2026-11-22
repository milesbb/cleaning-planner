import { describe, expect, it } from 'vitest';
import { type AgendaJob, buildAgenda } from './agenda';
import { parseCalendarDate } from './calendar-date';
import type { Completion } from './types';

const today = parseCalendarDate('2026-11-25');
const tomorrow = parseCalendarDate('2026-11-26');
const memberIds = ['sam', 'alex'];

function done(completedOn: string, completedBy: string): Completion {
  return { completedOn: parseCalendarDate(completedOn), completedBy, outcome: 'done' };
}

function skipped(completedOn: string, completedBy: string): Completion {
  return { completedOn: parseCalendarDate(completedOn), completedBy, outcome: 'skipped' };
}

function weeklyJob(id: string, overrides: Partial<AgendaJob> = {}): AgendaJob {
  return {
    id,
    schedule: { type: 'floating', every: { value: 1, unit: 'week' } },
    startDate: today,
    assignment: { kind: 'anyone' },
    completions: [],
    ...overrides,
  };
}

function agendaFor(jobs: AgendaJob[], person?: string): ReturnType<typeof buildAgenda> {
  return buildAgenda({
    jobs,
    memberIds,
    today,
    weekStartsOn: 'monday',
    range: { from: today, to: tomorrow },
    ...(person === undefined ? {} : { person }),
  });
}

describe('buildAgenda', () => {
  it('puts jobs due today and tomorrow on their days', () => {
    const agenda = agendaFor([weeklyJob('vacuum'), weeklyJob('mop', { startDate: tomorrow })]);
    expect(agenda.days.map((day) => [day.date, day.due.map((item) => item.jobId)])).toEqual([
      ['2026-11-25', ['vacuum']],
      ['2026-11-26', ['mop']],
    ]);
    expect(agenda.late).toEqual([]);
  });

  it('lists late jobs oldest first, with their status and who they are for', () => {
    const agenda = agendaFor([
      weeklyJob('filter', {
        startDate: parseCalendarDate('2026-11-23'),
        assignment: { kind: 'member', memberId: 'alex' },
      }),
      weeklyJob('oven', { startDate: parseCalendarDate('2026-11-10') }),
    ]);
    expect(agenda.late).toEqual([
      { jobId: 'oven', dueDate: '2026-11-10', status: 'late', assignee: null },
      { jobId: 'filter', dueDate: '2026-11-23', status: 'late', assignee: 'alex' },
    ]);
  });

  it('shows a job done today as done, and moves its next due date on', () => {
    const agenda = agendaFor([
      weeklyJob('sheets', {
        startDate: parseCalendarDate('2026-11-18'),
        completions: [done('2026-11-25', 'sam')],
      }),
    ]);
    const [todayInAgenda] = agenda.days;
    expect(todayInAgenda?.due).toEqual([]);
    expect(todayInAgenda?.done).toEqual([
      { jobId: 'sheets', completedOn: '2026-11-25', completedBy: 'sam' },
    ]);
    expect(agenda.late).toEqual([]);
  });

  it('lists jobs done on the same day by id so the order is stable', () => {
    const doneToday = { startDate: parseCalendarDate('2026-11-18') };
    const agenda = agendaFor([
      weeklyJob('windows', { ...doneToday, completions: [done('2026-11-25', 'sam')] }),
      weeklyJob('bins', { ...doneToday, completions: [done('2026-11-25', 'alex')] }),
    ]);
    expect(agenda.days[0]?.done.map((item) => item.jobId)).toEqual(['bins', 'windows']);
  });

  it('never lists a skip as done', () => {
    const agenda = agendaFor([
      weeklyJob('windows', { completions: [skipped('2026-11-25', 'sam')] }),
    ]);
    expect(agenda.days[0]?.done).toEqual([]);
  });

  it('keeps empty days so every day in the range is shown', () => {
    const agenda = buildAgenda({
      jobs: [],
      memberIds,
      today,
      weekStartsOn: 'monday',
      range: { from: parseCalendarDate('2026-11-23'), to: parseCalendarDate('2026-11-29') },
    });
    expect(agenda.days.map((day) => day.date)).toEqual([
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
      '2026-11-27',
      '2026-11-28',
      '2026-11-29',
    ]);
    expect(agenda.days.every((day) => day.due.length === 0 && day.done.length === 0)).toBe(true);
  });

  it('also shows a late job on its own day when that day is in the range', () => {
    const agenda = buildAgenda({
      jobs: [weeklyJob('filter', { startDate: parseCalendarDate('2026-11-23') })],
      memberIds,
      today,
      weekStartsOn: 'monday',
      range: { from: parseCalendarDate('2026-11-23'), to: parseCalendarDate('2026-11-29') },
    });
    expect(agenda.days[0]?.due).toEqual([
      { jobId: 'filter', dueDate: '2026-11-23', status: 'late', assignee: null },
    ]);
    expect(agenda.late.map((item) => item.jobId)).toEqual(['filter']);
  });

  it('labels jobs later in the week as this week', () => {
    const agenda = buildAgenda({
      jobs: [weeklyJob('dust', { startDate: parseCalendarDate('2026-11-28') })],
      memberIds,
      today,
      weekStartsOn: 'monday',
      range: { from: today, to: parseCalendarDate('2026-11-29') },
    });
    expect(agenda.days[3]?.due[0]?.status).toBe('thisWeek');
  });

  it('leaves out jobs due after the range', () => {
    const agenda = agendaFor([weeklyJob('oven', { startDate: parseCalendarDate('2026-12-01') })]);
    expect(agenda.days.flatMap((day) => day.due)).toEqual([]);
  });

  it('sorts jobs due on the same day by id so the order is stable', () => {
    const agenda = agendaFor([weeklyJob('vacuum'), weeklyJob('bins'), weeklyJob('mop')]);
    expect(agenda.days[0]?.due.map((item) => item.jobId)).toEqual(['bins', 'mop', 'vacuum']);
  });

  it('honours fixed schedules and snoozes', () => {
    const agenda = agendaFor([
      weeklyJob('bins', {
        schedule: { type: 'fixed', on: { kind: 'weekdays', weekdays: ['thursday'] } },
        startDate: parseCalendarDate('2026-11-20'),
      }),
      weeklyJob('oven', {
        startDate: today,
        snooze: { from: today, until: tomorrow },
      }),
    ]);
    expect(agenda.days[1]?.due.map((item) => item.jobId)).toEqual(['bins', 'oven']);
  });

  it('works out whose turn it is', () => {
    const agenda = agendaFor([
      weeklyJob('bathroom', {
        startDate: parseCalendarDate('2026-11-11'),
        assignment: { kind: 'takeTurns' },
        completions: [done('2026-11-18', 'sam')],
      }),
    ]);
    expect(agenda.days[0]?.due[0]?.assignee).toBe('alex');
  });
});

describe('buildAgenda for one person', () => {
  const jobs = [
    weeklyJob('alex-only', { assignment: { kind: 'member', memberId: 'alex' } }),
    weeklyJob('sam-only', { assignment: { kind: 'member', memberId: 'sam' } }),
    weeklyJob('anyone'),
    weeklyJob('done-by-alex', {
      startDate: parseCalendarDate('2026-11-18'),
      completions: [done('2026-11-25', 'alex')],
    }),
    weeklyJob('done-by-sam', {
      startDate: parseCalendarDate('2026-11-18'),
      completions: [done('2026-11-25', 'sam')],
    }),
  ];

  it("keeps that person's jobs and jobs for anyone", () => {
    const agenda = agendaFor(jobs, 'sam');
    expect(agenda.days[0]?.due.map((item) => item.jobId)).toEqual(['anyone', 'sam-only']);
  });

  it('keeps only what that person did', () => {
    const agenda = agendaFor(jobs, 'sam');
    expect(agenda.days[0]?.done.map((item) => item.jobId)).toEqual(['done-by-sam']);
  });

  it('keeps everything without a person', () => {
    const agenda = agendaFor(jobs);
    expect(agenda.days[0]?.due).toHaveLength(3);
    expect(agenda.days[0]?.done).toHaveLength(2);
  });
});

describe('buildAgenda ranges', () => {
  it('rejects a range that ends before it starts', () => {
    expect(() =>
      buildAgenda({
        jobs: [],
        memberIds,
        today,
        weekStartsOn: 'monday',
        range: { from: tomorrow, to: today },
      }),
    ).toThrow('An agenda range must end on or after its start');
  });

  it('allows a single day', () => {
    const agenda = buildAgenda({
      jobs: [],
      memberIds,
      today,
      weekStartsOn: 'monday',
      range: { from: today, to: today },
    });
    expect(agenda.days.map((day) => day.date)).toEqual(['2026-11-25']);
  });

  it('allows exactly 62 days', () => {
    const agenda = buildAgenda({
      jobs: [],
      memberIds,
      today,
      weekStartsOn: 'monday',
      range: { from: today, to: parseCalendarDate('2027-01-25') },
    });
    expect(agenda.days).toHaveLength(62);
  });

  it('rejects a range longer than about two months', () => {
    expect(() =>
      buildAgenda({
        jobs: [],
        memberIds,
        today,
        weekStartsOn: 'monday',
        range: { from: today, to: parseCalendarDate('2027-03-01') },
      }),
    ).toThrow('An agenda range can cover at most 62 days');
  });
});
