import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { WeekScreen } from './week-screen';

export const metadata: Metadata = { title: 'This week' };

export default function WeekPage(): ReactNode {
  return <WeekScreen />;
}
