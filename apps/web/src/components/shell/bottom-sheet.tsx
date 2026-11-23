'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { CloseIcon } from '../icons/interface-icons';
import { IconButton } from '../ui/icon-button';

interface BottomSheetProps {
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trigger?: ReactNode;
  // Where focus goes on closing when there is no trigger. Without it, focus
  // goes back to whatever had it on opening, which Safari leaves as nothing
  // after a tap.
  returnFocusTo?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

interface FocusReturn {
  onOpenAutoFocus?: () => void;
  onCloseAutoFocus?: (event: Event) => void;
}

const SHEET_CLASSES =
  'fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col gap-4 overflow-y-auto rounded-t-[1.5rem] border-2 border-b-0 border-ink bg-paper px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-ink shadow-hard focus:outline-hidden motion-safe:animate-sheet-up sm:inset-0 sm:m-auto sm:h-fit sm:w-[min(32rem,calc(100vw-2rem))] sm:rounded-card sm:border-b-2 sm:pb-5 sm:motion-safe:animate-fade-in';

function useFocusReturnToOpener(
  hasTrigger: boolean,
  returnFocusTo: RefObject<HTMLElement | null> | undefined,
): FocusReturn {
  const openerRef = useRef<HTMLElement | null>(null);
  if (hasTrigger) return {};
  return {
    onOpenAutoFocus: (): void => {
      openerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    },
    onCloseAutoFocus: (event): void => {
      event.preventDefault();
      (returnFocusTo?.current ?? openerRef.current)?.focus();
    },
  };
}

function SheetHeader({
  title,
  description,
}: {
  title: string;
  description: string | undefined;
}): ReactNode {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <Dialog.Title className="font-display text-2xl font-extrabold">{title}</Dialog.Title>
        {description === undefined ? null : (
          <Dialog.Description className="text-base">{description}</Dialog.Description>
        )}
      </div>
      <Dialog.Close asChild>
        <IconButton label="Close" icon={<CloseIcon />} />
      </Dialog.Close>
    </div>
  );
}

export function BottomSheet({
  title,
  description,
  open,
  onOpenChange,
  trigger,
  returnFocusTo,
  children,
}: BottomSheetProps): ReactNode {
  const focusReturn = useFocusReturnToOpener(trigger !== undefined, returnFocusTo);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger === undefined ? null : <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 motion-safe:animate-fade-in" />
        <Dialog.Content
          className={SHEET_CLASSES}
          {...focusReturn}
          {...(description === undefined ? { 'aria-describedby': undefined } : {})}
        >
          <SheetHeader title={title} description={description} />
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
