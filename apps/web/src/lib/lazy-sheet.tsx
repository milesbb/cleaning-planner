'use client';

import { Suspense, useMemo, useState } from 'react';
import type { ReactNode, RefObject } from 'react';

// What a sheet loaded on first use needs from the button that opens it.
export interface SheetOpening {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  returnFocusTo: RefObject<HTMLElement | null>;
}

export interface SheetTriggerProps {
  'aria-haspopup': 'dialog';
  'aria-expanded': boolean;
  onClick: () => void;
}

interface LazySheetProps {
  trigger: (triggerProps: SheetTriggerProps) => ReactNode;
  sheet: (opening: SheetOpening) => ReactNode;
}

// Renders the button straight away and the sheet (a React.lazy component,
// with the dialog code inside it) only once the button is first used, so
// neither is part of the page's first load. Each opening starts the sheet
// afresh, as if it had just been loaded.
export function LazySheet({ trigger, sheet }: LazySheetProps): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [openings, setOpenings] = useState(0);
  const [openedFrom, setOpenedFrom] = useState<HTMLElement | null>(null);
  const returnFocusTo = useMemo(() => ({ current: openedFrom }), [openedFrom]);
  const open = (): void => {
    const focused = document.activeElement;
    setOpenedFrom(focused instanceof HTMLElement ? focused : null);
    setOpenings((count) => count + 1);
    setIsOpen(true);
  };
  return (
    <>
      {trigger({ 'aria-haspopup': 'dialog', 'aria-expanded': isOpen, onClick: open })}
      {openings > 0 ? (
        <Suspense key={openings} fallback={null}>
          {sheet({ open: isOpen, onOpenChange: setIsOpen, returnFocusTo })}
        </Suspense>
      ) : null}
    </>
  );
}
