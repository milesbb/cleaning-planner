'use client';

import * as RadioGroup from '@radix-ui/react-radio-group';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from './badge';
import { FIELD_LABEL_CLASSES } from './field-messages';

interface SegmentedOption<Value extends string> {
  value: Value;
  label: string;
  isRecommended?: boolean;
}

interface SegmentedControlProps<Value extends string> {
  label: string;
  options: readonly SegmentedOption<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
  className?: string;
  optionsClassName?: string;
}

export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  onValueChange,
  className,
  optionsClassName,
}: SegmentedControlProps<Value>): ReactNode {
  const labelId = useId();
  const chooseOption = (chosenValue: string): void => {
    const chosenOption = options.find((option) => option.value === chosenValue);
    if (chosenOption !== undefined) onValueChange(chosenOption.value);
  };
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span id={labelId} className={FIELD_LABEL_CLASSES}>
        {label}
      </span>
      <RadioGroup.Root
        aria-labelledby={labelId}
        value={value}
        onValueChange={chooseOption}
        orientation="horizontal"
        className={cn(
          'flex flex-wrap gap-1 rounded-control border-2 border-ink bg-card p-1',
          optionsClassName,
        )}
      >
        {options.map((option) => (
          <SegmentOption key={option.value} option={option} />
        ))}
      </RadioGroup.Root>
    </div>
  );
}

function SegmentOption<Value extends string>({
  option,
}: {
  option: SegmentedOption<Value>;
}): ReactNode {
  return (
    <RadioGroup.Item
      value={option.value}
      className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-[calc(var(--radius-control)-4px)] px-3 font-bold text-ink focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-ink data-[state=checked]:bg-ink data-[state=checked]:text-card"
    >
      {option.label}{' '}
      {option.isRecommended === true ? (
        <Badge tone="recommended" className="px-2 py-0 text-xs">
          Recommended
        </Badge>
      ) : null}
    </RadioGroup.Item>
  );
}
