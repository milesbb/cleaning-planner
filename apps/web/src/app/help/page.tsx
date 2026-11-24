import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppGuide } from '@/components/guide/app-guide';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/shell/page-header';
import { SignInFirst } from '@/components/start/sign-in-first';

export const metadata: Metadata = { title: 'Help' };

export default function HelpPage(): ReactNode {
  return (
    <AppShell activeTab="help" layout="split">
      <SignInFirst />
      <PageHeader title="Help" subtitle="What you can do and where to find it." />
      <AppGuide />
    </AppShell>
  );
}
