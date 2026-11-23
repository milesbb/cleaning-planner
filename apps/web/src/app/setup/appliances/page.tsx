import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SetupScreen } from '../setup-screen';
import { AppliancesForm } from './appliances-form';

export const metadata: Metadata = { title: 'Appliances and floors' };

export default function SetupAppliancesPage(): ReactNode {
  return (
    <SetupScreen
      step={2}
      back="/setup/rooms"
      title="What do you have at home?"
      intro="Appliances and floors add their own jobs, like cleaning the oven or mopping."
    >
      <AppliancesForm />
    </SetupScreen>
  );
}
