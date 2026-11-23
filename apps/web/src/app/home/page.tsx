import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { HomeScreen } from './home-screen';

export const metadata: Metadata = { title: 'Home' };

export default function HomePage(): ReactNode {
  return <HomeScreen />;
}
