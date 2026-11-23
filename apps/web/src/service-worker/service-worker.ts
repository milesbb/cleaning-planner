/// <reference lib="webworker" />
import { Serwist } from 'serwist';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { openFromNotification } from './open-from-notification';
import { pageFileUrls } from './page-file-urls';
import { reminderNotificationFor } from './reminder-notification';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[];
  }
}

declare const self: ServiceWorkerGlobalScope;

const ANY_QUERY = /.*/;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanupOutdatedCaches: true,
    // Pages read record ids from the query (`/job/?id=…`), so every query opens the same file.
    ignoreURLParametersMatching: [ANY_QUERY],
    urlManipulation: pageFileUrls,
  },
  // An open page keeps the files it loaded until it closes; a new version waits rather than
  // deleting chunks the page may still ask for.
  skipWaiting: false,
  clientsClaim: true,
});

self.addEventListener('push', (event) => {
  const { title, options } = reminderNotificationFor(event.data?.text() ?? null);
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    openFromNotification(self.clients, event.notification.data, self.location.origin),
  );
});

serwist.addEventListeners();
