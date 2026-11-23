import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { WelcomeScreen } from './welcome-sections';

export const metadata: Metadata = { title: 'Welcome' };

export default function WelcomePage(): ReactNode {
  return <WelcomeScreen />;
}
