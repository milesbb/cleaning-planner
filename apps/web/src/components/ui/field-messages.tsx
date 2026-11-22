import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { InfoIcon } from '../icons/interface-icons';

export const FIELD_CLASSES = 'flex flex-col gap-1.5';

export const FIELD_LABEL_CLASSES = 'font-display text-base font-bold';

const FRAME_CLASSES =
  'min-h-13.5 w-full rounded-control border-2 border-ink bg-card text-lg text-ink focus-within:shadow-[inset_0_0_0_1px_var(--ink),0_0_0_4px_var(--kitchen)]';

export function fieldFrameClasses(hasError: boolean, extraClasses?: string): string {
  return cn(FRAME_CLASSES, hasError && 'bg-late-soft', extraClasses);
}

function hintIdFor(fieldId: string): string {
  return `${fieldId}-hint`;
}

function errorIdFor(fieldId: string): string {
  return `${fieldId}-error`;
}

export function describedByFor(
  fieldId: string,
  hint: string | undefined,
  error: string | undefined,
): string | undefined {
  const messageIds = [
    hint === undefined ? null : hintIdFor(fieldId),
    error === undefined ? null : errorIdFor(fieldId),
  ].filter((messageId) => messageId !== null);
  return messageIds.length === 0 ? undefined : messageIds.join(' ');
}

interface FieldMessagesProps {
  fieldId: string;
  hint: string | undefined;
  error: string | undefined;
}

export function FieldMessages({ fieldId, hint, error }: FieldMessagesProps): ReactNode {
  return (
    <>
      {hint === undefined ? null : (
        <p id={hintIdFor(fieldId)} className="text-base">
          {hint}
        </p>
      )}
      {error === undefined ? null : (
        <p id={errorIdFor(fieldId)} className="flex items-start gap-1.5 text-base font-bold">
          <InfoIcon size={20} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </>
  );
}
