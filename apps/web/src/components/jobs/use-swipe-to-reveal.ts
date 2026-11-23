'use client';

import { useRef, useState } from 'react';
import type { MouseEvent, PointerEvent, RefObject } from 'react';
import { isOpenAfterSwipe, swipeDirection, swipeOffset } from './swipe-gesture';
import type { SwipeDirection } from './swipe-gesture';

type SwipePhase = 'closed' | 'dragging' | 'open';

interface Drag {
  startX: number;
  startY: number;
  wasOpen: boolean;
  direction: SwipeDirection;
  offset: number;
}

interface SwipeHandlers {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onClickCapture: (event: MouseEvent<HTMLElement>) => void;
}

export interface SwipeToReveal {
  phase: SwipePhase;
  close: () => void;
  handlers: SwipeHandlers;
}

// While a finger drags, the row follows it without re-rendering; at rest its
// classes place it, so the inline transform is cleared.
function showOffset(row: HTMLElement | null, offset: number | null): void {
  if (row === null) return;
  row.style.transform = offset === null ? '' : `translateX(${String(offset)}px)`;
  row.style.transition = offset === null ? '' : 'none';
}

function followFinger(drag: Drag, event: PointerEvent<HTMLElement>): boolean {
  const distanceAcross = event.clientX - drag.startX;
  if (drag.direction === 'undecided') {
    drag.direction = swipeDirection(distanceAcross, event.clientY - drag.startY);
  }
  if (drag.direction !== 'horizontal') return false;
  drag.offset = swipeOffset(drag.wasOpen, distanceAcross);
  return true;
}

interface SwipeRefs {
  row: RefObject<HTMLElement | null>;
  drag: RefObject<Drag | null>;
  isSwallowingClick: RefObject<boolean>;
}

function startDrag(refs: SwipeRefs, event: PointerEvent<HTMLElement>, wasOpen: boolean): void {
  refs.isSwallowingClick.current = false;
  if (event.pointerType !== 'touch') return;
  refs.drag.current = {
    startX: event.clientX,
    startY: event.clientY,
    wasOpen,
    direction: 'undecided',
    offset: swipeOffset(wasOpen, 0),
  };
}

function endDrag(refs: SwipeRefs): Drag | null {
  const ended = refs.drag.current;
  refs.drag.current = null;
  showOffset(refs.row.current, null);
  return ended;
}

// The click a browser may send after a swipe is the swipe's, not a tap on the
// row; a tap on an open row only closes it.
function guardClick(
  refs: SwipeRefs,
  event: MouseEvent<HTMLElement>,
  phase: SwipePhase,
): 'closeRow' | 'none' {
  if (!refs.isSwallowingClick.current && phase !== 'open') return 'none';
  event.preventDefault();
  event.stopPropagation();
  if (!refs.isSwallowingClick.current) return 'closeRow';
  refs.isSwallowingClick.current = false;
  return 'none';
}

function useSwipeHandlers(
  rowRef: RefObject<HTMLElement | null>,
  phase: SwipePhase,
  setPhase: (phase: SwipePhase) => void,
): SwipeHandlers {
  const drag = useRef<Drag | null>(null);
  const isSwallowingClick = useRef(false);
  const refs: SwipeRefs = { row: rowRef, drag, isSwallowingClick };
  return {
    onPointerDown: (event): void => {
      startDrag(refs, event, phase === 'open');
    },
    onPointerMove: (event): void => {
      const drag = refs.drag.current;
      if (drag === null || !followFinger(drag, event)) return;
      setPhase('dragging');
      showOffset(refs.row.current, drag.offset);
    },
    onPointerUp: (): void => {
      const ended = endDrag(refs);
      if (ended?.direction !== 'horizontal') return;
      refs.isSwallowingClick.current = true;
      setPhase(isOpenAfterSwipe(ended.offset) ? 'open' : 'closed');
    },
    onPointerCancel: (): void => {
      const ended = endDrag(refs);
      if (ended !== null) setPhase(ended.wasOpen ? 'open' : 'closed');
    },
    onClickCapture: (event): void => {
      if (guardClick(refs, event, phase) === 'closeRow') setPhase('closed');
    },
  };
}

// Touch only: a mouse, keyboard or screen reader uses the row's More button.
export function useSwipeToReveal(rowRef: RefObject<HTMLElement | null>): SwipeToReveal {
  const [phase, setPhase] = useState<SwipePhase>('closed');
  const handlers = useSwipeHandlers(rowRef, phase, setPhase);
  return {
    phase,
    close: (): void => {
      setPhase('closed');
    },
    handlers,
  };
}
