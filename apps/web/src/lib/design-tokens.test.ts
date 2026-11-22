import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  cssVariableName,
  ORIGINAL_PALETTE,
  type Palette,
  PALETTE_KEYS,
  SOFTENED_PALETTE,
  type PaletteKey,
  TEXT_ON_BACKGROUND_PAIRS,
} from './design-tokens';

const globalStyles = readFileSync(resolve('src/app/globals.css'), 'utf8');

function cssBlock(selector: string): string {
  const start = globalStyles.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No ${selector} block in globals.css`);
  return globalStyles.slice(start, globalStyles.indexOf('}', start));
}

function declaredValue(block: string, key: PaletteKey): string | undefined {
  const match = new RegExp(`${cssVariableName(key)}:\\s*(#[0-9a-f]{6});`, 'i').exec(block);
  return match?.[1]?.toLowerCase();
}

const palettes: [name: string, selector: string, palette: Palette][] = [
  ['softened', ':root', SOFTENED_PALETTE],
  ['original', "[data-palette='original']", ORIGINAL_PALETTE],
];

describe.each(palettes)('the %s palette', (_, selector, palette) => {
  it.each(PALETTE_KEYS)('defines %s in globals.css with the same value', (key) => {
    expect(declaredValue(cssBlock(selector), key)).toBe(palette[key]);
  });

  it.each(TEXT_ON_BACKGROUND_PAIRS)(
    'has readable %s text on %s (at least 4.5:1)',
    (text, background) => {
      expect(contrastRatio(palette[text], palette[background])).toBeGreaterThanOrEqual(4.5);
    },
  );
});

describe('contrastRatio', () => {
  it('is 21:1 for black on white and 1:1 for a colour on itself', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#26302c', '#26302c')).toBeCloseTo(1, 5);
  });

  it('is the same whichever way round the colours are', () => {
    expect(contrastRatio('#26302c', '#f5cf62')).toBeCloseTo(
      contrastRatio('#f5cf62', '#26302c'),
      10,
    );
  });

  it('rejects colours that are not six-digit hex', () => {
    expect(() => contrastRatio('red', '#ffffff')).toThrow('Expected a #rrggbb colour, got red');
  });
});

describe('cssVariableName', () => {
  it('turns a palette key into its CSS variable', () => {
    expect(cssVariableName('wholeHome')).toBe('--whole-home');
    expect(cssVariableName('ink')).toBe('--ink');
  });
});
