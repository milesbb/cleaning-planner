import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME, ThemeColors } from '@/lib/app-identity';
import './globals.css';

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_SHORT_NAME, statusBarStyle: 'default' },
  icons: { apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }] },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: ThemeColors.lightBackground },
    { media: '(prefers-color-scheme: dark)', color: ThemeColors.darkBackground },
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
