import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { StartOrJoinScreen } from './start-or-join-screen';

export const metadata: Metadata = { title: 'Start or join a home' };

export default function StartOrJoinPage(): ReactNode {
  return <StartOrJoinScreen />;
}
