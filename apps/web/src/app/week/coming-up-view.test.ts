import { agendaSchema } from '@cleaning-planner/contracts/agenda';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describe, expect, it } from 'vitest';
import { TODAY_FIXTURE } from '../today/today-fixture';
import { buildComingUp, comingUpRange } from './coming-up-view';

const THIS_WEEK = {
  from: parseCalendarDate('2026-11-23'),
  to: parseCalendarDate('2026-11-29'),
};

function due(jobId: string, dueDate: string): object {
  return { jobId, dueDate, status: 'later', assignee: null };
}

function fourWeeks(dueOn: Record<string, object[]>): ReturnType<typeof agendaSchema.parse> {
  const days = Array.from({ length: 28 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 10, 30 + index)).toISOString().slice(0, 10);
    return { date, due: dueOn[date] ?? [], done: [] };
  });
  return agendaSchema.parse({ late: [], days });
}

describe('comingUpRange', () => {
  it('covers the four weeks after the week shown', () => {
    expect(comingUpRange(THIS_WEEK)).toEqual({ from: '2026-11-30', to: '2026-12-27' });
  });
});

describe('buildComingUp', () => {
  it('groups the next four weeks by week, soonest first', () => {
    const agenda = fourWeeks({
      '2026-12-02': [due('job-oven', '2026-12-02')],
      '2026-11-30': [due('job-bins', '2026-11-30')],
      '2026-12-15': [due('job-bed', '2026-12-15')],
    });
    const weeks = buildComingUp({ agenda, jobs: TODAY_FIXTURE.jobs }, comingUpRange(THIS_WEEK));
    expect(weeks.map((week) => week.title)).toEqual([
      'Week of 30 November',
      'Week of 7 December',
      'Week of 14 December',
      'Week of 21 December',
    ]);
    expect(weeks[0]?.jobs).toEqual([
      { jobId: 'job-bins', name: 'Empty the bins', icon: 'bins', when: 'Monday 30 November' },
      { jobId: 'job-oven', name: 'Clean the oven', icon: 'oven', when: 'Wednesday 2 December' },
    ]);
    expect(weeks[1]?.jobs).toEqual([]);
    expect(weeks[2]?.jobs.map((job) => job.name)).toEqual(['Change the bed']);
  });

  it('lists a job due on several days of a week once, with its days', () => {
    const agenda = fourWeeks({
      '2026-11-30': [due('job-hob', '2026-11-30')],
      '2026-12-02': [due('job-hob', '2026-12-02')],
      '2026-12-04': [due('job-hob', '2026-12-04')],
    });
    const [firstWeek] = buildComingUp(
      { agenda, jobs: TODAY_FIXTURE.jobs },
      comingUpRange(THIS_WEEK),
    );
    expect(firstWeek?.jobs).toEqual([
      { jobId: 'job-hob', name: 'Wipe the hob', icon: 'spray', when: 'Mon, Wed, Fri' },
    ]);
  });

  it('says every day for a job due all week', () => {
    const daily = Object.fromEntries(
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(Date.UTC(2026, 10, 30 + index)).toISOString().slice(0, 10);
        return [date, [due('job-hob', date)]];
      }),
    );
    const [firstWeek] = buildComingUp(
      { agenda: fourWeeks(daily), jobs: TODAY_FIXTURE.jobs },
      comingUpRange(THIS_WEEK),
    );
    expect(firstWeek?.jobs[0]?.when).toBe('Every day');
  });

  it('leaves out jobs that no longer exist', () => {
    const agenda = fourWeeks({ '2026-11-30': [due('job-gone', '2026-11-30')] });
    const [firstWeek] = buildComingUp(
      { agenda, jobs: TODAY_FIXTURE.jobs },
      comingUpRange(THIS_WEEK),
    );
    expect(firstWeek?.jobs).toEqual([]);
  });
});
