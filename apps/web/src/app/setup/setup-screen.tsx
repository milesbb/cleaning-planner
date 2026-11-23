import type { ReactNode } from 'react';
import { AccountHeading, AccountScreen } from '@/components/account/account-screen';
import type { AccountScreenLayout } from '@/components/account/account-screen';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STEP_COUNT = 3;
const STEPS = Array.from({ length: STEP_COUNT }, (_, index) => index + 1);

interface SetupScreenProps {
  step: number;
  back: string;
  title: string;
  intro: string;
  layout?: Exclude<AccountScreenLayout, 'welcome'>;
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

// The frame for the three setup steps: back link, progress, heading. Steps
// with a list of choices take the `choices` layout, which widens from 1024px.
export function SetupScreen({
  step,
  back,
  title,
  intro,
  layout = 'form',
  children,
}: SetupScreenProps): ReactNode {
  return (
    <AccountScreen back={{ href: back, label: 'Back' }} layout={layout}>
      <StepProgress step={step} />
      <AccountHeading title={title}>{intro}</AccountHeading>
      {children}
    </AccountScreen>
  );
}

// Under two columns of choices a full-width button would stretch across both.
export function ChoicesContinueButton(): ReactNode {
  return (
    <Button type="submit" className="lg:max-w-xs">
      Continue
    </Button>
  );
}
