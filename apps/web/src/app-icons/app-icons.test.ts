import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APPLE_TOUCH_ICON, MANIFEST_ICONS, SPLASH_SCREENS } from './app-icons';

const ICONS_FOLDER = resolve(import.meta.dirname, '../../public/icons');
const PNG_SIGNATURE = '89504e470d0a1a0a';
const WIDTH_OFFSET = 16;
const HEIGHT_OFFSET = 20;

function pngSize(file: string): { width: number; height: number } {
  const png = readFileSync(resolve(ICONS_FOLDER, file));
  expect(png.subarray(0, 8).toString('hex')).toBe(PNG_SIGNATURE);
  return { width: png.readUInt32BE(WIDTH_OFFSET), height: png.readUInt32BE(HEIGHT_OFFSET) };
}

describe('app icons', () => {
  it.each([...MANIFEST_ICONS, APPLE_TOUCH_ICON])(
    '$file is a $sizePixels px square PNG',
    ({ file, sizePixels }) => {
      expect(pngSize(file)).toEqual({ width: sizePixels, height: sizePixels });
    },
  );

  it('has icons for Android install, and maskable ones at the same sizes', () => {
    const sizesFor = (purpose: string): number[] =>
      MANIFEST_ICONS.filter((icon) => icon.purpose === purpose).map((icon) => icon.sizePixels);
    expect(sizesFor('any')).toEqual([192, 512]);
    expect(sizesFor('maskable')).toEqual([192, 512]);
  });

  it('uses the 180 px size iOS asks for on the home screen', () => {
    expect(APPLE_TOUCH_ICON.sizePixels).toBe(180);
  });
});

describe('iOS splash screens', () => {
  it.each(SPLASH_SCREENS)(
    '$file is a PNG of its screen size',
    ({ file, widthPixels, heightPixels }) => {
      expect(pngSize(file)).toEqual({ width: widthPixels, height: heightPixels });
    },
  );

  it('matches each screen once, in portrait', () => {
    const queries = SPLASH_SCREENS.map((screen) => screen.media);
    expect(new Set(queries).size).toBe(queries.length);
    expect(queries.every((query) => query.endsWith('(orientation: portrait)'))).toBe(true);
  });

  it('names each file after its pixel size', () => {
    expect(SPLASH_SCREENS).toContainEqual(
      expect.objectContaining({
        file: 'splash-1179x2556.png',
        media:
          '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      }),
    );
  });
});
