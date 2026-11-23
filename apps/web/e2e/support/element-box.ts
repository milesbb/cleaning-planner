import { expect } from '@playwright/test';
import type { Locator } from '@playwright/test';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error('Element is not visible');
  return box;
}

export function expectBeside(left: Box, right: Box): void {
  expect(right.x).toBeGreaterThan(left.x + left.width);
}

export function expectBelow(top: Box, bottom: Box): void {
  expect(bottom.y).toBeGreaterThanOrEqual(top.y + top.height);
}

// Tiles or options in a grid: how many share the first one's row.
export async function countInFirstRow(items: Locator): Promise<number> {
  const tops = await items.evaluateAll((elements) =>
    elements.map((element) => Math.round(element.getBoundingClientRect().top)),
  );
  return tops.filter((top) => top === tops[0]).length;
}
