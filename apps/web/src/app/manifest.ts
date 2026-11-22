import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cleaning Planner',
    short_name: 'Cleaning',
    description: 'Know what needs cleaning today and this week, with reminders.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f6faf9',
    theme_color: '#0f766e',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
