import { agendaSchema } from '@cleaning-planner/contracts/agenda';
import { jobSchema } from '@cleaning-planner/contracts/job';
import type { Job } from '@cleaning-planner/contracts/job';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import type { TodaySources } from './today-view';

// One home on Tuesday 24 November 2026, seen by Alex: shared by Today's tests.
function job(
  id: string,
  roomId: string,
  details: Pick<Job, 'name' | 'icon' | 'effortMinutes'>,
): Job {
  return jobSchema.parse({
    id,
    roomId,
    libraryId: null,
    schedule: { type: 'floating', every: { value: 1, unit: 'week' } },
    startDate: '2026-11-01',
    assignment: { kind: 'anyone' },
    snooze: null,
    version: 1,
    ...details,
  });
}

export const TODAY_FIXTURE: TodaySources = {
  today: parseCalendarDate('2026-11-24'),
  tomorrow: parseCalendarDate('2026-11-25'),
  myUserId: 'user-alex',
  members: [
    { userId: 'user-alex', name: 'Alex', colour: 'pink', role: 'member' },
    { userId: 'user-sam', name: 'Sam', colour: 'blue', role: 'owner' },
  ],
  rooms: [
    { id: 'room-kitchen', type: 'kitchen', name: 'Kitchen', order: 0, appliances: [], version: 1 },
    {
      id: 'room-living',
      type: 'livingRoom',
      name: 'Living room',
      order: 1,
      appliances: [],
      version: 1,
    },
    { id: 'room-bed', type: 'bedroom', name: 'Bedroom', order: 2, appliances: [], version: 1 },
  ],
  jobs: [
    job('job-oven', 'room-kitchen', { name: 'Clean the oven', icon: 'oven', effortMinutes: 30 }),
    job('job-vacuum', 'room-living', {
      name: 'Vacuum the living room',
      icon: 'vacuum',
      effortMinutes: 15,
    }),
    job('job-hob', 'room-kitchen', { name: 'Wipe the hob', icon: 'spray', effortMinutes: 5 }),
    job('job-bins', 'room-kitchen', { name: 'Empty the bins', icon: 'bins', effortMinutes: 5 }),
    job('job-bed', 'room-bed', { name: 'Change the bed', icon: 'bed', effortMinutes: 10 }),
  ],
  agenda: agendaSchema.parse({
    late: [{ jobId: 'job-oven', dueDate: '2026-11-22', status: 'late', assignee: 'user-sam' }],
    days: [
      {
        date: '2026-11-24',
        due: [
          { jobId: 'job-vacuum', dueDate: '2026-11-24', status: 'today', assignee: 'user-alex' },
          { jobId: 'job-hob', dueDate: '2026-11-24', status: 'today', assignee: null },
        ],
        done: [{ jobId: 'job-bins', completedOn: '2026-11-24', completedBy: 'user-sam' }],
      },
      {
        date: '2026-11-25',
        due: [{ jobId: 'job-bed', dueDate: '2026-11-25', status: 'tomorrow', assignee: null }],
        done: [],
      },
    ],
  }),
};
