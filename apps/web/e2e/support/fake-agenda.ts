import type { Page } from '@playwright/test';
import { fakeApi } from './fake-backend';
import { calendarDay, DAY_MS, dueItemsFor, HOME_PATH } from './fake-home-state';

function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  for (let time = Date.parse(from); time <= Date.parse(to); time += DAY_MS) {
    days.push(new Date(time).toISOString().slice(0, 10));
  }
  return days;
}

// The agenda for the days asked for: what's due on each day, and anything
// ticked off as done today.
function agendaFor(url: string, doneJobIds: ReadonlySet<string>): object {
  const query = new URL(url).searchParams;
  const dueItems = dueItemsFor(doneJobIds);
  return {
    late: dueItems.filter((item) => item.status === 'late'),
    days: daysBetween(query.get('from') ?? calendarDay(0), query.get('to') ?? calendarDay(1)).map(
      (date) => ({
        date,
        due: dueItems.filter((item) => item.dueDate === date),
        done:
          date === calendarDay(0)
            ? [...doneJobIds].map((jobId) => ({
                jobId,
                completedOn: date,
                completedBy: 'user-alex',
              }))
            : [],
      }),
    ),
  };
}

export async function fakeAgenda(page: Page, doneJobIds: ReadonlySet<string>): Promise<void> {
  await fakeApi(page, `${HOME_PATH}/agenda*`, (request) => ({
    body: agendaFor(request.url(), doneJobIds),
  }));
}
