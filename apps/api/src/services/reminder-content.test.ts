import { agendaSchema } from '@cleaning-planner/contracts/agenda';
import type { AgendaResponse } from '@cleaning-planner/contracts/agenda';
import { describe, expect, it } from 'vitest';
import { reminderMessageFor } from './reminder-content';
import type { HomeReminderSource } from './reminder-content';

const NAMES = new Map([
  ['job-oven', 'Clean the oven'],
  ['job-hob', 'Wipe the hob'],
  ['job-bins', 'Empty the bins'],
  ['job-bed', 'Change the bed'],
  ['job-vacuum', 'Vacuum the living room'],
]);

function due(jobId: string, dueDate: string, status = 'today'): object {
  return { jobId, dueDate, status, assignee: null };
}

function agenda(late: object[], days: Record<string, object[]>): AgendaResponse {
  return agendaSchema.parse({
    late,
    days: Object.entries(days).map(([date, dueItems]) => ({ date, due: dueItems, done: [] })),
  });
}

function home(homeAgenda: AgendaResponse): HomeReminderSource {
  return { agenda: homeAgenda, jobNames: NAMES };
}

describe('reminderMessageFor', () => {
  it('lists what is late and due today, late first', () => {
    const today = agenda([due('job-oven', '2026-11-22', 'late')], {
      '2026-11-24': [due('job-hob', '2026-11-24'), due('job-bins', '2026-11-24')],
    });
    expect(reminderMessageFor('daily', [home(today)])).toEqual({
      title: '3 jobs today',
      body: 'Clean the oven, Wipe the hob and Empty the bins',
      url: '/today/',
    });
  });

  it('counts one job as one job, and shortens a long list', () => {
    expect(
      reminderMessageFor('daily', [
        home(agenda([], { '2026-11-24': [due('job-hob', '2026-11-24')] })),
      ])?.title,
    ).toBe('1 job today');
    const busy = agenda([], {
      '2026-11-24': ['job-oven', 'job-hob', 'job-bins', 'job-bed', 'job-vacuum'].map((jobId) =>
        due(jobId, '2026-11-24'),
      ),
    });
    expect(reminderMessageFor('daily', [home(busy)])?.body).toBe(
      'Clean the oven, Wipe the hob, Empty the bins and 2 more',
    );
  });

  it('lists each job once for the week, however often it is due', () => {
    const week = agenda([], {
      '2026-11-24': [due('job-hob', '2026-11-24')],
      '2026-11-25': [due('job-hob', '2026-11-25', 'tomorrow')],
      '2026-11-27': [due('job-bed', '2026-11-27', 'thisWeek')],
    });
    expect(reminderMessageFor('weekly', [home(week)])).toEqual({
      title: '2 jobs this week',
      body: 'Wipe the hob and Change the bed',
      url: '/week/',
    });
  });

  it('adds up every home', () => {
    const flat = agenda([], { '2026-11-24': [due('job-hob', '2026-11-24')] });
    const cabin = agenda([], { '2026-11-24': [due('job-hob', '2026-11-24')] });
    expect(reminderMessageFor('daily', [home(flat), home(cabin)])?.title).toBe('2 jobs today');
  });

  it('sends nothing when nothing is due', () => {
    expect(reminderMessageFor('daily', [home(agenda([], { '2026-11-24': [] }))])).toBeNull();
    expect(reminderMessageFor('weekly', [])).toBeNull();
  });

  it('leaves out jobs that have gone', () => {
    const gone = agenda([], { '2026-11-24': [due('job-gone', '2026-11-24')] });
    expect(reminderMessageFor('daily', [home(gone)])).toBeNull();
  });

  it('always sends a test reminder', () => {
    expect(reminderMessageFor('test', [])).toEqual({
      title: 'Reminders are on',
      body: 'This is how your cleaning reminders will look.',
      url: '/today/',
    });
  });
});
