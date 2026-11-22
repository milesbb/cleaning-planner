import type { ReactNode } from 'react';
import { AppNameRow } from '@/components/account/account-screen';
import { ArtFrame } from '@/components/art/art-frame';
import { ButtonLink } from '@/components/ui/button';

export function WelcomeIntro(): ReactNode {
  return (
    <div className="flex flex-col gap-8">
      <AppNameRow />
      <ArtFrame artKey="welcomeHero" alt="" />
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-[2.375rem] leading-[2.625rem] font-extrabold tracking-tight">
          Know what needs cleaning, and when.
        </h1>
        <p className="text-lg leading-relaxed">
          One shared plan for everyone you live with, with reminders on your phone.
        </p>
      </div>
    </div>
  );
}

export function WelcomeActions(): ReactNode {
  return (
    <div className="mt-auto flex flex-col gap-3.5">
      <ButtonLink href="/sign-up">Create an account</ButtonLink>
      <ButtonLink href="/sign-in" variant="secondary">
        Log in
      </ButtonLink>
    </div>
  );
}
