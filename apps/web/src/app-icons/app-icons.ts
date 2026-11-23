// Every app icon and iOS splash screen, generated into public/icons by
// generate-app-icons.ts and listed in the manifest and the root layout.

const ICON_FOLDER = '/icons';

// src/app/icon.svg, the browser tab's icon.
export const FAVICON_SIZE = 512;

export type IconPurpose = 'any' | 'maskable' | 'apple';

export interface AppIcon {
  file: string;
  sizePixels: number;
  purpose: IconPurpose;
}

export const MANIFEST_ICONS: readonly AppIcon[] = [
  { file: 'icon-192.png', sizePixels: 192, purpose: 'any' },
  { file: 'icon-512.png', sizePixels: 512, purpose: 'any' },
  { file: 'maskable-192.png', sizePixels: 192, purpose: 'maskable' },
  { file: 'maskable-512.png', sizePixels: 512, purpose: 'maskable' },
];

export const APPLE_TOUCH_ICON: AppIcon = {
  file: 'apple-touch-icon.png',
  sizePixels: 180,
  purpose: 'apple',
};

interface AppleScreen {
  widthPoints: number;
  heightPoints: number;
  pixelRatio: number;
}

// Portrait screens of the iPhones and iPads that can install the web app.
const APPLE_SCREENS: readonly AppleScreen[] = [
  { widthPoints: 440, heightPoints: 956, pixelRatio: 3 },
  { widthPoints: 430, heightPoints: 932, pixelRatio: 3 },
  { widthPoints: 428, heightPoints: 926, pixelRatio: 3 },
  { widthPoints: 414, heightPoints: 896, pixelRatio: 3 },
  { widthPoints: 414, heightPoints: 896, pixelRatio: 2 },
  { widthPoints: 402, heightPoints: 874, pixelRatio: 3 },
  { widthPoints: 393, heightPoints: 852, pixelRatio: 3 },
  { widthPoints: 390, heightPoints: 844, pixelRatio: 3 },
  { widthPoints: 375, heightPoints: 812, pixelRatio: 3 },
  { widthPoints: 375, heightPoints: 667, pixelRatio: 2 },
  { widthPoints: 320, heightPoints: 568, pixelRatio: 2 },
  { widthPoints: 1024, heightPoints: 1366, pixelRatio: 2 },
  { widthPoints: 834, heightPoints: 1194, pixelRatio: 2 },
  { widthPoints: 820, heightPoints: 1180, pixelRatio: 2 },
  { widthPoints: 810, heightPoints: 1080, pixelRatio: 2 },
  { widthPoints: 768, heightPoints: 1024, pixelRatio: 2 },
  { widthPoints: 744, heightPoints: 1133, pixelRatio: 2 },
];

export interface SplashScreen {
  file: string;
  widthPixels: number;
  heightPixels: number;
  media: string;
}

function splashScreenFor({ widthPoints, heightPoints, pixelRatio }: AppleScreen): SplashScreen {
  const widthPixels = widthPoints * pixelRatio;
  const heightPixels = heightPoints * pixelRatio;
  return {
    file: `splash-${String(widthPixels)}x${String(heightPixels)}.png`,
    widthPixels,
    heightPixels,
    media: `(device-width: ${String(widthPoints)}px) and (device-height: ${String(heightPoints)}px) and (-webkit-device-pixel-ratio: ${String(pixelRatio)}) and (orientation: portrait)`,
  };
}

export const SPLASH_SCREENS: readonly SplashScreen[] = APPLE_SCREENS.map(splashScreenFor);

export function iconUrl(file: string): string {
  return `${ICON_FOLDER}/${file}`;
}
