import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { NotFoundScreen } from './not-found-screen';

export const metadata: Metadata = { title: 'Page not found' };

// Exported as 404.html, which the host serves for any unknown address.
export default function NotFoundPage(): ReactNode {
  return <NotFoundScreen />;
}
