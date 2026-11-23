'use client';

import { useRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useSwipeToReveal } from './use-swipe-to-reveal';

interface SwipeAction {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
}

interface SwipeActionsProps {
  actions: readonly SwipeAction[];
  children: ReactNode;
}

const ACTION_CLASSES =
  'flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-card border-2 border-ink bg-card px-1 text-sm leading-tight font-bold text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink';

// On touch, swiping the row left uncovers its actions. They exist only while
// uncovered, so keyboards and screen readers meet the row's own buttons instead.
export function SwipeActions({ actions, children }: SwipeActionsProps): ReactNode {
  const rowRef = useRef<HTMLDivElement>(null);
  const { phase, close, handlers } = useSwipeToReveal(rowRef);
  return (
    <div className="relative">
      {phase === 'closed' ? null : (
        <div className="absolute inset-y-0 right-0 flex w-40 gap-2 pl-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={ACTION_CLASSES}
              onClick={() => {
                close();
                action.onSelect();
              }}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
      <div
        ref={rowRef}
        {...handlers}
        className={cn(
          'relative touch-pan-y transition-transform motion-reduce:transition-none',
          phase === 'open' ? '-translate-x-40' : 'translate-x-0',
        )}
      >
        {children}
      </div>
    </div>
  );
}
