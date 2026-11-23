import { describe, expect, it } from 'vitest';
import { SWIPE_REVEAL_WIDTH, isOpenAfterSwipe, swipeDirection, swipeOffset } from './swipe-gesture';

describe('swipeDirection', () => {
  it('waits until the finger has moved a little', () => {
    expect(swipeDirection(4, 3)).toBe('undecided');
  });

  it('is sideways when the finger moves more across than down', () => {
    expect(swipeDirection(-30, 8)).toBe('horizontal');
  });

  it('is a scroll when the finger moves more down than across', () => {
    expect(swipeDirection(8, -30)).toBe('vertical');
  });
});

describe('swipeOffset', () => {
  it('follows the finger to the left', () => {
    expect(swipeOffset(false, -60)).toBe(-60);
  });

  it('stops at the actions’ width', () => {
    expect(swipeOffset(false, -400)).toBe(-SWIPE_REVEAL_WIDTH);
  });

  it('never moves right of where the row rests', () => {
    expect(swipeOffset(false, 50)).toBe(0);
  });

  it('starts from the open position when the actions already show', () => {
    expect(swipeOffset(true, 40)).toBe(40 - SWIPE_REVEAL_WIDTH);
  });
});

describe('isOpenAfterSwipe', () => {
  it('opens once the row has moved over half the actions’ width', () => {
    expect(isOpenAfterSwipe(-SWIPE_REVEAL_WIDTH / 2)).toBe(true);
    expect(isOpenAfterSwipe(-SWIPE_REVEAL_WIDTH / 2 + 1)).toBe(false);
  });
});
