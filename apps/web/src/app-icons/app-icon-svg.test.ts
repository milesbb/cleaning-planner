import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SOFTENED_PALETTE } from '@/lib/design-tokens';
import { appIconSvg, splashSvg } from './app-icon-svg';
import { FAVICON_SIZE } from './app-icons';

const HOUSE_ROOF = 'M3 11l9-7 9 7';

describe('appIconSvg', () => {
  it('draws the app mark in paper on an ink tile with rounded corners', () => {
    const svg = appIconSvg('any', 512);
    expect(svg).toContain('viewBox="0 0 512 512"');
    expect(svg).toContain(`fill="${SOFTENED_PALETTE.ink}"`);
    expect(svg).toMatch(/<rect[^>]* rx="\d+/);
    expect(svg).toContain(HOUSE_ROOF);
    expect(svg).toContain(`stroke="${SOFTENED_PALETTE.paper}"`);
    expect(svg).not.toContain('currentColor');
  });

  it('fills the whole square for maskable and Apple icons, which the system shapes', () => {
    expect(appIconSvg('maskable', 192)).not.toMatch(/<rect[^>]* rx=/);
    expect(appIconSvg('apple', 180)).not.toMatch(/<rect[^>]* rx=/);
  });

  it('keeps the maskable mark inside the safe circle', () => {
    const markWidth = (svg: string): number =>
      Number(/<svg x="[^"]+" y="[^"]+" width="(\d+(?:\.\d+)?)"/.exec(svg)?.[1]);
    expect(markWidth(appIconSvg('maskable', 512))).toBeLessThanOrEqual(512 * 0.56);
    expect(markWidth(appIconSvg('any', 512))).toBeGreaterThan(
      markWidth(appIconSvg('maskable', 512)),
    );
  });
});

describe('the browser tab icon', () => {
  it('is the app icon, so it changes with it', () => {
    const favicon = readFileSync(resolve(import.meta.dirname, '../app/icon.svg'), 'utf8');
    expect(favicon.trim()).toBe(appIconSvg('any', FAVICON_SIZE));
  });
});

describe('splashSvg', () => {
  it('centres the icon on the paper background at the screen size', () => {
    const svg = splashSvg(1179, 2556);
    expect(svg).toContain('viewBox="0 0 1179 2556"');
    expect(svg).toContain(`fill="${SOFTENED_PALETTE.paper}"`);
    expect(svg).toContain(HOUSE_ROOF);
  });
});
