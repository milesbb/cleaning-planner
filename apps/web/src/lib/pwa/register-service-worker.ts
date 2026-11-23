const SERVICE_WORKER_PATH = '/sw.js';

export interface ServiceWorkerHost {
  register: (scriptUrl: string, options: { scope: string }) => Promise<unknown>;
}

export type ServiceWorkerRegistrationResult = 'registered' | 'off' | 'unsupported' | 'failed';

export async function registerServiceWorker(
  host: ServiceWorkerHost | undefined,
  isEnabled: boolean,
): Promise<ServiceWorkerRegistrationResult> {
  if (!isEnabled) return 'off';
  if (host === undefined) return 'unsupported';
  try {
    await host.register(SERVICE_WORKER_PATH, { scope: '/' });
    return 'registered';
  } catch {
    // Without the worker the site still works online, so there is nothing to tell the person.
    return 'failed';
  }
}
