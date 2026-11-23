'use client';

import { WEEKDAYS_FROM_SUNDAY } from '@cleaning-planner/schedule/calendar-date';
import { describeInterval } from '@cleaning-planner/schedule/interval';
import { describeSchedule } from '@cleaning-planner/schedule/describe-schedule';
import { isRecommendedInterval } from '@cleaning-planner/schedule/library/job-library';
import type { RecommendedRange } from '@cleaning-planner/schedule/library/types';
import type { IntervalUnit, Schedule, Weekday } from '@cleaning-planner/schedule/types';
import type { ReactNode } from 'react';
import { TEXT_ACTION_CLASSES } from '@/components/account/account-screen';
import { Badge } from '@/components/ui/badge';
import { CheckboxGroup } from '@/components/ui/checkbox-group';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SelectField } from '@/components/ui/select-field';
import { Stepper } from '@/components/ui/stepper';
import type { MonthDay, ScheduleDraft } from '@/lib/home/schedule-draft';

// The parts of the "How often" sheet, one for each kind of repeat.

const MAX_REPEAT_VALUE = 365;
const LAST_DAY_OF_ANY_MONTH = 31;

const UNIT_CHOICES = [
  { value: 'day', label: 'Days' },
  { value: 'week', label: 'Weeks' },
  { value: 'month', label: 'Months' },
] as const satisfies readonly { value: IntervalUnit; label: string }[];

const WEEKDAYS_FROM_MONDAY: readonly Weekday[] = [
  ...WEEKDAYS_FROM_SUNDAY.slice(1),
  ...WEEKDAYS_FROM_SUNDAY.slice(0, 1),
];

const WEEKDAY_CHOICES = WEEKDAYS_FROM_MONDAY.map((weekday) => ({
  value: weekday,
  label: `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}`,
}));

const MONTH_DAYS = Array.from({ length: LAST_DAY_OF_ANY_MONTH }, (_, index) => String(index + 1));

type DraftChange = (changes: Partial<ScheduleDraft>) => void;

interface DraftFieldsProps {
  draft: ScheduleDraft;
  onChange: DraftChange;
}

export function AfterDoneFields({ draft, onChange }: DraftFieldsProps): ReactNode {
  const unitLabel = UNIT_CHOICES.find((choice) => choice.value === draft.every.unit)?.label;
  return (
    <>
      <SegmentedControl<IntervalUnit>
        label="Repeat every few"
        options={UNIT_CHOICES}
        value={draft.every.unit}
        onValueChange={(unit) => {
          onChange({ every: { ...draft.every, unit } });
        }}
      />
      <Stepper
        label={unitLabel ?? 'Units'}
        value={draft.every.value}
        minimum={1}
        maximum={MAX_REPEAT_VALUE}
        onValueChange={(value) => {
          onChange({ every: { ...draft.every, value } });
        }}
      />
    </>
  );
}

export function WeekdayFields({
  draft,
  onChange,
  error,
}: DraftFieldsProps & { error: string | undefined }): ReactNode {
  return (
    <CheckboxGroup
      label="Days"
      options={WEEKDAY_CHOICES}
      values={draft.weekdays}
      onValuesChange={(weekdays) => {
        onChange({ weekdays });
      }}
      error={error}
    />
  );
}

function monthDayFrom(value: string): MonthDay {
  return value === 'last' ? 'last' : Number(value);
}

export function MonthDayFields({ draft, onChange }: DraftFieldsProps): ReactNode {
  return (
    <SelectField
      label="Day of the month"
      value={String(draft.monthDay)}
      onValueChange={(value) => {
        onChange({ monthDay: monthDayFrom(value) });
      }}
    >
      {MONTH_DAYS.map((day) => (
        <option key={day} value={day}>
          {day}
        </option>
      ))}
      <option value="last">Last day</option>
    </SelectField>
  );
}

interface RecommendationProps {
  draft: ScheduleDraft;
  range: RecommendedRange;
  recommended: Schedule;
  onUse: () => void;
}

function recommendationLabel(schedule: Schedule): string {
  return schedule.type === 'floating'
    ? describeInterval(schedule.every)
    : describeSchedule(schedule);
}

// "Recommended" when the interval is in the library's range; otherwise a way back to it.
export function Recommendation({
  draft,
  range,
  recommended,
  onUse,
}: RecommendationProps): ReactNode {
  if (draft.kind === 'afterDone' && isRecommendedInterval(draft.every, range)) {
    return (
      <Badge tone="recommended" className="self-start">
        Recommended
      </Badge>
    );
  }
  return (
    <button type="button" onClick={onUse} className={`${TEXT_ACTION_CLASSES} self-start`}>
      Use the recommendation: {recommendationLabel(recommended)}
    </button>
  );
}
