import type { ReactNode } from 'react';
import { AccountScreen, AppNameRow } from '@/components/account/account-screen';
import { ArtFrame } from '@/components/art/art-frame';
import { ButtonLink } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// From 1024px the intro's pieces join the actions in one grid (the intro box
// itself drops out with `lg:contents`): the art fills the left column, and the
// app name, words and buttons sit in the middle rows of the right one, so the
// spare rows above and below centre them beside the art.
const WORDS_COLUMN = 'lg:col-start-2';

function WelcomeIntro(): ReactNode {
  return (
    <div className="flex flex-col gap-8 lg:contents">
      <div className={cn(WORDS_COLUMN, 'lg:row-start-2')}>
        <AppNameRow />
      </div>
      <ArtFrame
        artKey="welcomeHero"
        alt=""
        className="lg:col-start-1 lg:row-span-full lg:self-center"
      />
      <div className={cn('flex flex-col gap-3', WORDS_COLUMN, 'lg:row-start-3')}>
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
    <div className={cn('mt-auto flex flex-col gap-3.5 sm:mt-0', WORDS_COLUMN, 'lg:row-start-4')}>
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
    <AccountScreen layout="welcome">
      <div className="flex flex-1 flex-col gap-7 sm:flex-none sm:gap-8 lg:grid lg:grid-cols-[1fr_26rem] lg:grid-rows-[1fr_auto_auto_auto_1fr] lg:gap-x-12">
        <WelcomeIntro />
        <WelcomeActions />
      </div>
    </AccountScreen>
  );
}
