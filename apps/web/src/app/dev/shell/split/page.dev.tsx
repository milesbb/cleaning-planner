import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { SplitShellDemo } from './split-shell-demo';

export const metadata: Metadata = {
  title: 'App shell: two columns',
  robots: { index: false, follow: false },
};

export default function SplitShellPage(): ReactNode {
  return (
    <AppShell activeTab="week" layout="split">
      <SplitShellDemo />
    </AppShell>
  );
}
