'use client';

import type { ReactNode } from 'react';
import { SkipIcon, SnoozeIcon } from '@/components/icons/interface-icons';
import { BottomSheet } from '@/components/shell/bottom-sheet';
import { Button } from '@/components/ui/button';
import type { SheetOpening } from '@/lib/lazy-sheet';

interface JobChoicesSheetProps extends SheetOpening {
  jobName: string;
  onSnoozeADay: () => void;
  onSkip: () => void;
}

// Loaded on first use (`LazySheet`): the same choices a swipe uncovers on touch.
export function JobChoicesSheet({
  jobName,
  onSnoozeADay,
  onSkip,
  open,
  onOpenChange,
  returnFocusTo,
}: JobChoicesSheetProps): ReactNode {
  const choose = (choice: () => void) => (): void => {
    onOpenChange(false);
    choice();
  };
  return (
    <BottomSheet
      title={jobName}
      description="Put it off until tomorrow, or skip it this time."
      open={open}
      onOpenChange={onOpenChange}
      returnFocusTo={returnFocusTo}
    >
      <div className="flex flex-col gap-3">
        <Button variant="secondary" onClick={choose(onSnoozeADay)}>
          <SnoozeIcon />
          Snooze a day
        </Button>
        <Button variant="secondary" onClick={choose(onSkip)}>
          <SkipIcon />
          Skip
        </Button>
      </div>
    </BottomSheet>
  );
}
