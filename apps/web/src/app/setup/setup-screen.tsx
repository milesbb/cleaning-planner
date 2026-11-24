import type { ReactNode } from 'react';
import { AccountHeading, AccountScreen } from '@/components/account/account-screen';
import { SignInFirst } from '@/components/start/sign-in-first';
import { cn } from '@/lib/utils';

const STEP_COUNT = 3;
const STEPS = Array.from({ length: STEP_COUNT }, (_, index) => index + 1);

interface SetupScreenProps {
  step: number;
  back: string;
  title: string;
  intro: string;
  children: ReactNode;
}

function StepProgress({ step }: { step: number }): ReactNode {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[0.9375rem] font-bold">
        Step {step} of {STEP_COUNT}
      </p>
      <div aria-hidden="true" className="flex gap-1.5">
        {STEPS.map((stepNumber) => (
          <span
            key={stepNumber}
            className={cn(
              'h-2 flex-1 rounded-full border-2 border-ink',
              stepNumber <= step ? 'bg-ink' : 'bg-card',
            )}
          />
        ))}
      </div>
    </div>
  );
}

// The frame for the three setup steps: back link, progress, heading.
export function SetupScreen({ step, back, title, intro, children }: SetupScreenProps): ReactNode {
  return (
    <AccountScreen back={{ href: back, label: 'Back' }}>
      <SignInFirst />
      <StepProgress step={step} />
      <AccountHeading title={title}>{intro}</AccountHeading>
      {children}
    </AccountScreen>
  );
}
