import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SettingsScreen } from './settings-screen';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage(): ReactNode {
  return <SettingsScreen />;
}
