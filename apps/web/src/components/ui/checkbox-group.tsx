'use client';

import { useId } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
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

const OPTION_CLASSES =
  'flex min-h-12 cursor-pointer items-center gap-2 rounded-control border-2 border-ink bg-card px-3 font-bold has-[:checked]:bg-ink has-[:checked]:text-card has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink';

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
          <label key={option.value} className={OPTION_CLASSES}>
            <input
              type="checkbox"
              className="size-5 accent-ink"
              checked={values.includes(option.value)}
              onChange={(event) => {
                toggle(option.value, event.target.checked);
              }}
            />
            {option.label}
          </label>
        ))}
      </div>
      <FieldMessages fieldId={groupId} hint={undefined} error={error} />
    </fieldset>
  );
}
