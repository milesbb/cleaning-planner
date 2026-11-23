import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SetupScreen } from '../setup-screen';
import { RoomsForm } from './rooms-form';

export const metadata: Metadata = { title: 'Pick your rooms' };

export default function SetupRoomsPage(): ReactNode {
  return (
    <SetupScreen
      step={1}
      back="/homes/new"
      title="Which rooms do you have?"
      intro="We’ll suggest what each one needs. You can add or remove rooms later."
    >
      <RoomsForm />
    </SetupScreen>
  );
}
