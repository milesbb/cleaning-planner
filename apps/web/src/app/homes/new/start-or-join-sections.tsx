import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { JoinWithCode } from './join-with-code';

export function StartANewHome(): ReactNode {
  return (
    <Card className="flex flex-col gap-4">
      <p className="text-[1.0625rem] leading-relaxed">
        Pick your rooms and we’ll suggest what needs doing, and how often.
      </p>
      <ButtonLink href="/setup/rooms">Start a new home</ButtonLink>
    </Card>
  );
}

export function JoinSomeonesHome(): ReactNode {
  return (
    <section aria-labelledby="join-heading" className="flex flex-1 flex-col gap-3">
      <h2 id="join-heading" className="font-display text-xl font-extrabold">
        Join someone’s home
      </h2>
      <p className="text-[1.0625rem] leading-relaxed">
        Open the invite link they sent you, or type the code here.
      </p>
      <JoinWithCode />
    </section>
  );
}
