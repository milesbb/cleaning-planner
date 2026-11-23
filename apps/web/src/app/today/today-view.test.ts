import { agendaSchema } from '@cleaning-planner/contracts/agenda';
import { describe, expect, it } from 'vitest';
import { TODAY_FIXTURE } from './today-fixture';
import { buildTodayView } from './today-view';

describe('buildTodayView', () => {
  it('splits the agenda into late, today, done today and tomorrow', () => {
    const view = buildTodayView(TODAY_FIXTURE);
    expect(view.late.map((job) => job.name)).toEqual(['Clean the oven']);
    expect(view.today.map((job) => job.name)).toEqual(['Vacuum the living room', 'Wipe the hob']);
    expect(view.done.map((job) => job.name)).toEqual(['Empty the bins']);
    expect(view.tomorrow.map((job) => job.name)).toEqual(['Change the bed']);
  });

  it('describes each job by room, who it is for and how long it takes', () => {
    const { late, today } = buildTodayView(TODAY_FIXTURE);
    expect(late[0]).toMatchObject({
      jobId: 'job-oven',
      icon: 'oven',
      room: 'kitchen',
      meta: 'Kitchen · Sam · 30 min',
      lateBy: '2 days late',
      assignee: { name: 'Sam', colour: 'blue' },
    });
    expect(today[0]?.meta).toBe('Living room · You · 15 min');
    expect(today[1]?.meta).toBe('Kitchen · Anyone · 5 min');
    expect(today[1]?.assignee).toBeNull();
  });

  it('says one day late without a plural', () => {
    const view = buildTodayView({
      ...TODAY_FIXTURE,
      agenda: agendaSchema.parse({
        ...TODAY_FIXTURE.agenda,
        late: [{ jobId: 'job-oven', dueDate: '2026-11-23', status: 'late', assignee: null }],
      }),
    });
    expect(view.late[0]?.lateBy).toBe('1 day late');
  });

  it('says who did each job, calling the signed-in person you', () => {
    const view = buildTodayView({
      ...TODAY_FIXTURE,
      agenda: {
        ...TODAY_FIXTURE.agenda,
        days: TODAY_FIXTURE.agenda.days.map((day) => ({
          ...day,
          done: day.done.map((done) => ({ ...done, completedBy: 'user-alex' })),
        })),
      },
    });
    expect(view.done[0]?.doneBy).toBe('you');
    expect(buildTodayView(TODAY_FIXTURE).done[0]?.doneBy).toBe('Sam');
  });

  it('remembers people who have left the home', () => {
    const view = buildTodayView({ ...TODAY_FIXTURE, members: [] });
    expect(view.done[0]?.doneBy).toBe('a former member');
    expect(view.late[0]?.meta).toBe('Kitchen · Former member · 30 min');
  });

  it('adds up the minutes still to do today, late jobs included', () => {
    expect(buildTodayView(TODAY_FIXTURE).minutesLeft).toBe(50);
  });

  it('skips jobs that were deleted since the agenda was built', () => {
    const view = buildTodayView({
      ...TODAY_FIXTURE,
      jobs: TODAY_FIXTURE.jobs.filter((job) => job.id !== 'job-hob'),
    });
    expect(view.today.map((job) => job.name)).toEqual(['Vacuum the living room']);
  });
});
