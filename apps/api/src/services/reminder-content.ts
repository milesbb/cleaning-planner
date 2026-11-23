import type { AgendaResponse } from '@cleaning-planner/contracts/agenda';
import type { ReminderMessage } from '@cleaning-planner/contracts/reminder-message';
import type { ReminderKind } from '@cleaning-planner/contracts/reminders';

// What a reminder says: how many jobs, the first few by name, calm wording.

const NAMES_SHOWN = 3;

const TEST_MESSAGE: ReminderMessage = {
  title: 'Reminders are on',
  body: 'This is how your cleaning reminders will look.',
  url: '/today/',
};

const WORDING = {
  daily: { period: 'today', url: '/today/' },
  weekly: { period: 'this week', url: '/week/' },
} as const;

export interface HomeReminderSource {
  agenda: AgendaResponse;
  jobNames: ReadonlyMap<string, string>;
}

// Late jobs first, then by day; each job once, and only jobs that still exist.
function jobNamesIn({ agenda, jobNames }: HomeReminderSource): string[] {
  const jobIds = [...agenda.late, ...agenda.days.flatMap((day) => day.due)].map(
    (item) => item.jobId,
  );
  return [...new Set(jobIds)].flatMap((jobId) => {
    const name = jobNames.get(jobId);
    return name === undefined ? [] : [name];
  });
}

function listOf(names: readonly string[]): string {
  const shown = names.slice(0, NAMES_SHOWN);
  const hidden = names.length - shown.length;
  if (hidden > 0) return `${shown.join(', ')} and ${String(hidden)} more`;
  const last = shown.at(-1) ?? '';
  return shown.length === 1 ? last : `${shown.slice(0, -1).join(', ')} and ${last}`;
}

export function reminderMessageFor(
  kind: ReminderKind,
  homes: readonly HomeReminderSource[],
): ReminderMessage | null {
  if (kind === 'test') return TEST_MESSAGE;
  const names = homes.flatMap(jobNamesIn);
  if (names.length === 0) return null;
  const { period, url } = WORDING[kind];
  const count = names.length === 1 ? '1 job' : `${String(names.length)} jobs`;
  return { title: `${count} ${period}`, body: listOf(names), url };
}
