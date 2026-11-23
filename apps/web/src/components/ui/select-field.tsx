'use client';

import { useId } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FIELD_CLASSES, FIELD_LABEL_CLASSES, fieldFrameClasses } from './field-messages';

interface SelectFieldProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

// A labelled native select, so phones show their own picker.
export function SelectField({
  label,
  value,
  onValueChange,
  children,
  className,
}: SelectFieldProps): ReactNode {
  const selectId = useId();
  return (
    <div className={cn(FIELD_CLASSES, className)}>
      <label htmlFor={selectId} className={FIELD_LABEL_CLASSES}>
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);
        }}
        className={fieldFrameClasses(false, 'px-4 outline-hidden')}
      >
        {children}
      </select>
    </div>
  );
}
