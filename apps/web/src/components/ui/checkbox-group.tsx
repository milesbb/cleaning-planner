'use client';

import { useId } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CheckIcon } from '../icons/interface-icons';
import {
  FIELD_CLASSES,
  FIELD_LABEL_CLASSES,
  FieldMessages,
  describedByFor,
} from './field-messages';

interface CheckboxOption<Value extends string> {
  value: Value;
  label: string;
}

interface CheckboxGroupProps<Value extends string> {
  label: string;
  options: readonly CheckboxOption<Value>[];
  values: readonly Value[];
  onValuesChange: (values: Value[]) => void;
  error?: string | undefined;
  className?: string;
}

// The real checkbox covers the whole option (invisibly), so the tap target is
// the full chip rather than the small box drawn beside the text.
const INPUT_CLASSES = 'absolute inset-0 size-full cursor-pointer appearance-none rounded-control';

const BOX_CLASSES =
  'flex size-5 shrink-0 items-center justify-center rounded-[0.25rem] border-2 border-current';

const OPTION_CLASSES =
  'relative flex min-h-12 cursor-pointer items-center gap-2 rounded-control border-2 border-ink bg-card px-3 font-bold has-[:checked]:bg-ink has-[:checked]:text-card has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink';

interface CheckboxChipProps {
  label: string;
  isChecked: boolean;
  onCheckedChange: (isChecked: boolean) => void;
}

function CheckboxChip({ label, isChecked, onCheckedChange }: CheckboxChipProps): ReactNode {
  return (
    <label className={OPTION_CLASSES}>
      <input
        type="checkbox"
        className={INPUT_CLASSES}
        checked={isChecked}
        onChange={(event) => {
          onCheckedChange(event.target.checked);
        }}
      />
      <span aria-hidden className={BOX_CLASSES}>
        {isChecked ? <CheckIcon size={14} strokeWidth={3} /> : null}
      </span>
      {label}
    </label>
  );
}

// Several choices at once, such as days of the week. Values stay in the
// options' order whatever order they're ticked in.
export function CheckboxGroup<Value extends string>({
  label,
  options,
  values,
  onValuesChange,
  error,
  className,
}: CheckboxGroupProps<Value>): ReactNode {
  const groupId = useId();
  const toggle = (value: Value, isChecked: boolean): void => {
    const chosen = new Set(values);
    if (isChecked) chosen.add(value);
    else chosen.delete(value);
    onValuesChange(options.map((option) => option.value).filter((option) => chosen.has(option)));
  };
  return (
    <fieldset
      aria-describedby={describedByFor(groupId, undefined, error)}
      className={cn(FIELD_CLASSES, className)}
    >
      <legend className={cn(FIELD_LABEL_CLASSES, 'mb-1.5')}>{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <CheckboxChip
            key={option.value}
            label={option.label}
            isChecked={values.includes(option.value)}
            onCheckedChange={(isChecked) => {
              toggle(option.value, isChecked);
            }}
          />
        ))}
      </div>
      <FieldMessages fieldId={groupId} hint={undefined} error={error} />
    </fieldset>
  );
}
