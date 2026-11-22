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

interface StepperProps {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  onValueChange: (value: number) => void;
  className?: string;
}

export function Stepper({
  label,
  value,
  minimum,
  maximum,
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
            onValueChange(Math.max(value - 1, minimum));
          }}
        />
        <StepperCount labelId={labelId} value={value} />
        <IconButton
          label={`More ${countedThings}`}
          icon={<PlusIcon />}
          disabled={value >= maximum}
          onClick={() => {
            onValueChange(Math.min(value + 1, maximum));
          }}
        />
      </div>
    </div>
  );
}
