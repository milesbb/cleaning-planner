import { describe, expect, it } from 'vitest';
import { installGuideFor, readInstallSituation } from './install-guide';
import type { InstallSituation } from './install-guide';

const BROWSER: InstallSituation = {
  isInstalled: false,
  isNativeApp: false,
  isAppleMobile: false,
  canPrompt: false,
};

describe('installGuideFor', () => {
  it('shows nothing once the site runs installed, or inside the apps', () => {
    expect(installGuideFor({ ...BROWSER, isInstalled: true, canPrompt: true })).toBe('hidden');
    expect(installGuideFor({ ...BROWSER, isNativeApp: true, isAppleMobile: true })).toBe('hidden');
  });

  it('walks iPhone and iPad through Add to Home Screen', () => {
    expect(installGuideFor({ ...BROWSER, isAppleMobile: true })).toBe('homeScreenSteps');
  });

  it('offers an Install button when the browser can prompt', () => {
    expect(installGuideFor({ ...BROWSER, canPrompt: true })).toBe('installButton');
  });

  it('points elsewhere to the browser’s own menu', () => {
    expect(installGuideFor(BROWSER)).toBe('browserMenu');
  });
});

interface FakeWindow {
  matchMedia: (query: string) => { matches: boolean };
  navigator: { userAgent: string; maxTouchPoints: number; standalone?: boolean };
  Capacitor?: unknown;
}

function fakeWindow(overrides: Partial<FakeWindow> = {}, standaloneQuery = false): FakeWindow {
  return {
    matchMedia: (query) => ({ matches: standaloneQuery && query === '(display-mode: standalone)' }),
    navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/130', maxTouchPoints: 0 },
    ...overrides,
  };
}

describe('readInstallSituation', () => {
  it('reads a desktop browser', () => {
    expect(readInstallSituation(fakeWindow(), false)).toEqual(BROWSER);
  });

  it('knows an installed site by its display mode, or iOS’s standalone flag', () => {
    expect(readInstallSituation(fakeWindow({}, true), false).isInstalled).toBe(true);
    const iosInstalled = fakeWindow({
      navigator: { userAgent: 'iPhone', maxTouchPoints: 5, standalone: true },
    });
    expect(readInstallSituation(iosInstalled, false).isInstalled).toBe(true);
  });

  it.each([
    ['an iPhone', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)', maxTouchPoints: 5 }],
    ['an iPad that says it is a Mac', { userAgent: 'Mozilla/5.0 (Macintosh)', maxTouchPoints: 5 }],
  ])('knows %s', (_name, navigator) => {
    expect(readInstallSituation(fakeWindow({ navigator }), false).isAppleMobile).toBe(true);
  });

  it('does not mistake a Mac for an iPad', () => {
    const mac = fakeWindow({
      navigator: { userAgent: 'Mozilla/5.0 (Macintosh)', maxTouchPoints: 0 },
    });
    expect(readInstallSituation(mac, false).isAppleMobile).toBe(false);
  });

  it('knows it is inside the native apps', () => {
    const app = fakeWindow({ Capacitor: { isNativePlatform: () => true } });
    expect(readInstallSituation(app, false).isNativeApp).toBe(true);
    const web = fakeWindow({ Capacitor: { isNativePlatform: () => false } });
    expect(readInstallSituation(web, false).isNativeApp).toBe(false);
  });

  it('passes on whether the browser can prompt', () => {
    expect(readInstallSituation(fakeWindow(), true).canPrompt).toBe(true);
  });
});
