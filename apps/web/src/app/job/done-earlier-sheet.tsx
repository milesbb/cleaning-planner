'use client';

import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { TEXT_ACTION_CLASSES } from '@/components/account/account-screen';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { formatDayHeading } from '@/lib/format-date';
import { checkEarlierDay, earlierDayChoices } from '@/lib/home/job-done-earlier';
import type { EarlierDayRange } from '@/lib/home/job-done-earlier';

interface DoneEarlierSheetProps {
  today: CalendarDate;
  range: EarlierDayRange;
  isBusy: boolean;
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

export function DoneEarlierSheet({
  today,
  range,
  isBusy,
  onDone,
}: DoneEarlierSheetProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const finish = (day: CalendarDate): void => {
    setIsOpen(false);
    onDone(day);
  };
  return (
    <BottomSheet
      title="Done on another day"
      description="Its next due day counts from the day it was really done."
      open={isOpen}
      onOpenChange={setIsOpen}
      trigger={
        <button type="button" className={`${TEXT_ACTION_CLASSES} self-center`} disabled={isBusy}>
          Done on another day…
        </button>
      }
    >
      <QuickChoices today={today} range={range} onPicked={finish} />
      <AnotherDayForm range={range} onPicked={finish} />
    </BottomSheet>
  );
}
