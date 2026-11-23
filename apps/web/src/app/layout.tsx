import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible, Bricolage_Grotesque } from 'next/font/google';
import type { ReactNode } from 'react';
import { APPLE_TOUCH_ICON, iconUrl, SPLASH_SCREENS } from '@/app-icons/app-icons';
import { AppProviders } from '@/components/app/app-providers';
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME, ThemeColors } from '@/lib/app-identity';
import './globals.css';

const displayFont = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '800'],
  variable: '--font-bricolage',
  display: 'swap',
});

const bodyFont = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-atkinson',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    title: APP_SHORT_NAME,
    statusBarStyle: 'default',
    startupImage: SPLASH_SCREENS.map(({ file, media }) => ({ url: iconUrl(file), media })),
  },
  icons: {
    apple: [
      {
        url: iconUrl(APPLE_TOUCH_ICON.file),
        sizes: `${String(APPLE_TOUCH_ICON.sizePixels)}x${String(APPLE_TOUCH_ICON.sizePixels)}`,
      },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: ThemeColors.background,
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): ReactNode {
  return (
    <html lang="en-GB" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="bg-paper text-ink antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
