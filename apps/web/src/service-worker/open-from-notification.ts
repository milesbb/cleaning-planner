import { appPathFrom } from './reminder-notification';

export interface AppWindow {
  focus: () => Promise<unknown>;
  navigate: (url: string) => Promise<unknown>;
}

export interface AppWindows {
  matchAll: (options: { type: 'window' }) => Promise<readonly AppWindow[]>;
  openWindow: (url: string) => Promise<unknown>;
}

async function moveWindow(appWindow: AppWindow, url: string): Promise<boolean> {
  try {
    await appWindow.focus();
    await appWindow.navigate(url);
    return true;
  } catch {
    // A window this worker doesn't control can't be navigated; a new window does the job instead.
    return false;
  }
}

export async function openFromNotification(
  windows: AppWindows,
  notificationData: unknown,
  origin: string,
): Promise<void> {
  const url = new URL(appPathFrom(notificationData), origin).href;
  const [openAppWindow] = await windows.matchAll({ type: 'window' });
  if (openAppWindow !== undefined && (await moveWindow(openAppWindow, url))) return;
  await windows.openWindow(url);
}
