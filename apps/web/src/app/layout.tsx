import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Cleaning Planner', template: '%s · Cleaning Planner' },
  description: 'Know what needs cleaning today and this week, with reminders.',
  applicationName: 'Cleaning Planner',
  appleWebApp: { capable: true, title: 'Cleaning', statusBarStyle: 'default' },
  icons: { apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }] },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6faf9' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1514' },
  ],
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): ReactNode {
  return (
    <html lang="en-GB">
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
