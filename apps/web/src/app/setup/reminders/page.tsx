import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SetupScreen } from '../setup-screen';
import { RemindersForm } from './reminders-form';

export const metadata: Metadata = { title: 'Reminders' };

export default function SetupRemindersPage(): ReactNode {
  return (
    <SetupScreen
      step={3}
      back="/setup/appliances"
      title="When should we nudge you?"
      intro="One calm reminder a day with what needs doing."
    >
      <RemindersForm />
    </SetupScreen>
  );
}
