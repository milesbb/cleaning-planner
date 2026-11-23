'use client';

import { useId } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MinusIcon, PlusIcon } from '../icons/interface-icons';
import { IconButton } from './icon-button';

interface StepperCountProps {
  labelId: string;
  value: number;
}

function StepperCount({ labelId, value }: StepperCountProps): ReactNode {
  return (
    <output
      aria-labelledby={labelId}
      aria-live="polite"
      className="min-w-8 text-center font-display text-2xl font-extrabold"
    >
      {value}
    </output>
  );
}

// The next whole step below or above, so an odd value (3 minutes) lands on
// the steps (5, 10) instead of staying off them.
function stepBelow(value: number, step: number): number {
  return Math.ceil(value / step) * step - step;
}

function stepAbove(value: number, step: number): number {
  return Math.floor(value / step) * step + step;
}

interface StepperProps {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  step?: number;
  onValueChange: (value: number) => void;
  className?: string;
}

export function Stepper({
  label,
  value,
  minimum,
  maximum,
  step = 1,
  onValueChange,
  className,
}: StepperProps): ReactNode {
  const labelId = useId();
  const countedThings = label.toLowerCase();
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <span id={labelId} className="font-bold">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <IconButton
          label={`Fewer ${countedThings}`}
          icon={<MinusIcon />}
          disabled={value <= minimum}
          onClick={() => {
            onValueChange(Math.max(stepBelow(value, step), minimum));
          }}
        />
        <StepperCount labelId={labelId} value={value} />
        <IconButton
          label={`More ${countedThings}`}
          icon={<PlusIcon />}
          disabled={value >= maximum}
          onClick={() => {
            onValueChange(Math.min(stepAbove(value, step), maximum));
          }}
        />
      </div>
    </div>
  );
}
