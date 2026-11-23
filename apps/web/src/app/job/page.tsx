import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { JobScreen } from './job-screen';

export const metadata: Metadata = { title: 'Job' };

export default function JobPage(): ReactNode {
  return <JobScreen />;
}
