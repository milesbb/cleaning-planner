import { useEffect } from 'react';
import { registerServiceWorker } from './register-service-worker';

export function useServiceWorker(): void {
  useEffect(() => {
    const host = 'serviceWorker' in navigator ? navigator.serviceWorker : undefined;
    void registerServiceWorker(host, process.env.NODE_ENV === 'production');
  }, []);
}
