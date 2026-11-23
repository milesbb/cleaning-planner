// What Settings says about installing the website as an app.

export type InstallGuide = 'hidden' | 'homeScreenSteps' | 'installButton' | 'browserMenu';

export interface InstallSituation {
  isInstalled: boolean;
  isNativeApp: boolean;
  isAppleMobile: boolean;
  canPrompt: boolean;
}

interface InstallWindow {
  matchMedia: (query: string) => { matches: boolean };
  navigator: { userAgent: string; maxTouchPoints: number; standalone?: boolean };
  Capacitor?: unknown;
}

const APPLE_MOBILE = /iPhone|iPad|iPod/;
const MAC = /Macintosh/;

export function installGuideFor(situation: InstallSituation): InstallGuide {
  if (situation.isInstalled || situation.isNativeApp) return 'hidden';
  if (situation.isAppleMobile) return 'homeScreenSteps';
  return situation.canPrompt ? 'installButton' : 'browserMenu';
}

// iPadOS says it is a Mac; only its touch screen gives it away.
function isAppleMobile({ userAgent, maxTouchPoints }: InstallWindow['navigator']): boolean {
  return APPLE_MOBILE.test(userAgent) || (MAC.test(userAgent) && maxTouchPoints > 1);
}

// Capacitor puts this on the window inside the iOS and Android apps.
interface CapacitorGlobal {
  isNativePlatform: () => unknown;
}

function isCapacitor(value: unknown): value is CapacitorGlobal {
  return (
    typeof value === 'object' &&
    value !== null &&
    'isNativePlatform' in value &&
    typeof value.isNativePlatform === 'function'
  );
}

function isNativeApp(capacitor: unknown): boolean {
  return isCapacitor(capacitor) && capacitor.isNativePlatform() === true;
}

export function readInstallSituation(view: InstallWindow, canPrompt: boolean): InstallSituation {
  return {
    isInstalled:
      view.matchMedia('(display-mode: standalone)').matches || view.navigator.standalone === true,
    isNativeApp: isNativeApp(view.Capacitor),
    isAppleMobile: isAppleMobile(view.navigator),
    canPrompt,
  };
}
