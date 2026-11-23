// The arithmetic of swiping a row aside to show its actions.

export const SWIPE_REVEAL_WIDTH = 160;
const DIRECTION_DECIDED_AFTER = 10;

export type SwipeDirection = 'undecided' | 'horizontal' | 'vertical';

export function swipeDirection(distanceAcross: number, distanceDown: number): SwipeDirection {
  const across = Math.abs(distanceAcross);
  const down = Math.abs(distanceDown);
  if (Math.max(across, down) < DIRECTION_DECIDED_AFTER) return 'undecided';
  return across > down ? 'horizontal' : 'vertical';
}

export function swipeOffset(wasOpen: boolean, distanceAcross: number): number {
  const restingOffset = wasOpen ? -SWIPE_REVEAL_WIDTH : 0;
  return Math.max(-SWIPE_REVEAL_WIDTH, Math.min(0, restingOffset + distanceAcross));
}

export function isOpenAfterSwipe(offset: number): boolean {
  return offset <= -SWIPE_REVEAL_WIDTH / 2;
}
