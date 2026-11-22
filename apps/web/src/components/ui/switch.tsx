'use client';

import * as SwitchPrimitive from '@radix-ui/react-switch';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Switch({
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  className,
}: SwitchProps): ReactNode {
  const switchId = useId();
  const descriptionId = `${switchId}-description`;
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="flex min-w-0 flex-col">
        <label htmlFor={switchId} className="font-bold">
          {label}
        </label>
        {description === undefined ? null : (
          <p id={descriptionId} className="text-base">
            {description}
          </p>
        )}
      </div>
      <SwitchPrimitive.Root
        id={switchId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={description === undefined ? undefined : descriptionId}
        className="relative inline-flex h-11 w-18 shrink-0 items-center rounded-full border-2 border-ink bg-card px-1 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-done"
      >
        <SwitchPrimitive.Thumb className="block size-8 rounded-full border-2 border-ink bg-card transition-transform motion-reduce:transition-none data-[state=checked]:translate-x-6.5 data-[state=checked]:bg-ink" />
      </SwitchPrimitive.Root>
    </div>
  );
}
