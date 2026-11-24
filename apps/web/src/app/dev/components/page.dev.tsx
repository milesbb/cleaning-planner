import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ArtDemo, SheetDemo } from './art-and-sheet-demo';
import { ButtonsDemo } from './buttons-demo';
import { ChoiceControlsDemo } from './choice-controls-demo';
import { DisplayDemo } from './display-demo';
import { FormFieldsDemo } from './form-fields-demo';
import { GuideDemo } from './guide-demo';
import { JobPiecesDemo } from './job-pieces-demo';

export const metadata: Metadata = {
  title: 'Components',
  robots: { index: false, follow: false },
};

export default function ComponentsPage(): ReactNode {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-[2.375rem] leading-[2.75rem] font-extrabold sm:text-[2.875rem]">
          Components
        </h1>
        <p>Every building block in every state, for checking at every screen size.</p>
      </header>
      <ButtonsDemo />
      <DisplayDemo />
      <FormFieldsDemo />
      <ChoiceControlsDemo />
      <JobPiecesDemo />
      <ArtDemo />
      <SheetDemo />
      <GuideDemo />
    </main>
  );
}
