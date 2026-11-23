'use client';

import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { formatDayHeading } from '@/lib/format-date';
import { checkEarlierDay, earlierDayChoices } from '@/lib/home/job-done-earlier';
import type { EarlierDayRange } from '@/lib/home/job-done-earlier';
import type { SheetOpening } from '@/lib/lazy-sheet';

interface DoneEarlierSheetProps extends SheetOpening {
  today: CalendarDate;
  range: EarlierDayRange;
  onDone: (day: CalendarDate) => void;
}

function AnotherDayForm({
  range,
  onPicked,
}: {
  range: EarlierDayRange;
  onPicked: (day: CalendarDate) => void;
}): ReactNode {
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | undefined>();
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const checked = checkEarlierDay(typed, range);
        if ('error' in checked) setError(checked.error);
        else onPicked(checked.day);
      }}
    >
      <TextField
        label="Another day"
        type="date"
        min={range.earliest ?? undefined}
        max={range.latest}
        value={typed}
        error={error}
        onChange={(event) => {
          setTyped(event.target.value);
        }}
      />
      <Button type="submit" variant="secondary">
        Save
      </Button>
    </form>
  );
}

function QuickChoices({
  today,
  range,
  onPicked,
}: {
  today: CalendarDate;
  range: EarlierDayRange;
  onPicked: (day: CalendarDate) => void;
}): ReactNode {
  return (
    <ul aria-label="Done on" className="flex flex-col gap-3">
      {earlierDayChoices(today, range).map((choice) => (
        <li key={choice.day}>
          <Button
            variant="secondary"
            className="w-full flex-col gap-0"
            onClick={() => {
              onPicked(choice.day);
            }}
          >
            <span>{choice.label}</span>
            <span className="text-sm font-normal">{formatDayHeading(choice.day)}</span>
          </Button>
        </li>
      ))}
    </ul>
  );
}

// Loaded on first use (`LazySheet`), and fresh each time it opens.
export function DoneEarlierSheet({
  today,
  range,
  onDone,
  open,
  onOpenChange,
  returnFocusTo,
}: DoneEarlierSheetProps): ReactNode {
  const finish = (day: CalendarDate): void => {
    onOpenChange(false);
    onDone(day);
  };
  return (
    <BottomSheet
      title="Done on another day"
      description="Its next due day counts from the day it was really done."
      open={open}
      onOpenChange={onOpenChange}
      returnFocusTo={returnFocusTo}
    >
      <QuickChoices today={today} range={range} onPicked={finish} />
      <AnotherDayForm range={range} onPicked={finish} />
    </BottomSheet>
  );
}
