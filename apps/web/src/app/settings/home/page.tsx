import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { HomeSettingsScreen } from './home-settings-screen';

export const metadata: Metadata = { title: 'Home settings' };

export default function HomeSettingsPage(): ReactNode {
  return <HomeSettingsScreen />;
}
