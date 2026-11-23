import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { TodayScreen } from './today-screen';

export const metadata: Metadata = { title: 'Today' };

export default function TodayPage(): ReactNode {
  return <TodayScreen />;
}
