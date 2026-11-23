import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { RoomScreen } from './room-screen';

export const metadata: Metadata = { title: 'Room' };

export default function RoomPage(): ReactNode {
  return <RoomScreen />;
}
