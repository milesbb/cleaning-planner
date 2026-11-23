import type { ReactNode } from 'react';
import { AccountScreen, AppNameRow } from '@/components/account/account-screen';
import { ArtFrame } from '@/components/art/art-frame';
import { ButtonLink } from '@/components/ui/button';

function WelcomeIntro(): ReactNode {
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

function WelcomeActions(): ReactNode {
  return (
    <div className="mt-auto flex flex-col gap-3.5">
      <ButtonLink href="/sign-up">Create an account</ButtonLink>
      <ButtonLink href="/sign-in" variant="secondary">
        Log in
      </ButtonLink>
    </div>
  );
}

// Welcome is also what "/" shows anyone with no session, straight from the
// static HTML, so a first visit never waits for JavaScript to see it.
export function WelcomeScreen(): ReactNode {
  return (
    <AccountScreen>
      <WelcomeIntro />
      <WelcomeActions />
    </AccountScreen>
  );
}
