import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { ShellDemo } from './shell-demo';

export const metadata: Metadata = {
  title: 'App shell',
  robots: { index: false, follow: false },
};

export default function ShellPage(): ReactNode {
  return (
    <AppShell activeTab="today">
      <ShellDemo />
    </AppShell>
  );
}
