import type { CalendarDate } from './calendar-date';
import type { Completion } from './types';

function latestOf(completions: readonly Completion[]): Completion | null {
  return completions.reduce<Completion | null>(
    (latest, completion) =>
      latest === null || completion.completedOn > latest.completedOn ? completion : latest,
    null,
  );
}

export function lastCompletedOn(completions: readonly Completion[]): CalendarDate | null {
  return latestOf(completions)?.completedOn ?? null;
}

export function lastDone(completions: readonly Completion[]): Completion | null {
  return latestOf(completions.filter((completion) => completion.outcome === 'done'));
}
