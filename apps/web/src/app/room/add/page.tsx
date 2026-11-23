import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AddJobScreen } from './add-job-screen';

export const metadata: Metadata = { title: 'Add a job' };

export default function AddJobPage(): ReactNode {
  return <AddJobScreen />;
}
