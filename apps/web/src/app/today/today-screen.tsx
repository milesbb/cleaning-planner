'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { FormAlert } from '@/components/account/account-screen';
import { AppShell } from '@/components/shell/app-shell';
import { HomeSwitcher } from '@/components/shell/home-switcher';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { formatDayHeading } from '@/lib/format-date';
import { AllDone, DoneList, DueList, TomorrowList } from './today-sections';
import { useToday } from './use-today';
import type { TodayFilter, TodayState } from './use-today';

type ReadyToday = Extract<TodayState, { kind: 'ready' }>;

const FILTERS = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'justMe', label: 'Just me' },
] as const satisfies readonly { value: TodayFilter; label: string }[];

function subtitleFor({ today, view }: ReadyToday): string {
  const workLeft = view.minutesLeft === 0 ? 'all done' : `about ${String(view.minutesLeft)} min`;
  return `${formatDayHeading(today)} · ${workLeft}`;
}

function TodayContent({ state }: { state: ReadyToday }): ReactNode {
  const { view, progress } = state;
  const isAllDone = view.late.length === 0 && view.today.length === 0;
  return (
    <>
      <PageHeader
        title="Today"
        subtitle={subtitleFor(state)}
        leading={
          <HomeSwitcher
            homes={state.homes}
            currentHomeId={state.currentHomeId}
            onSwitch={state.switchHome}
          />
        }
      />
      <SegmentedControl<TodayFilter>
        label="Show jobs for"
        options={FILTERS}
        value={state.filter}
        onValueChange={state.setFilter}
      />
      {progress.failure !== null && <FormAlert>{progress.failure}</FormAlert>}
      {isAllDone && <AllDone firstTomorrow={view.tomorrow[0]} />}
      <DueList title="Late" jobs={view.late} progress={progress} />
      <DueList title="Today" jobs={view.today} progress={progress} />
      <DoneList jobs={view.done} progress={progress} />
      <TomorrowList jobs={view.tomorrow} />
    </>
  );
}

function TodayProblem({ message, retry }: { message: string; retry: () => void }): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Today" />
      <FormAlert>{message}</FormAlert>
      <Button onClick={retry}>Try again</Button>
    </div>
  );
}

export function TodayScreen(): ReactNode {
  const state = useToday();
  const router = useRouter();
  const hasNoHome = state.kind === 'noHome';
  useEffect(() => {
    if (hasNoHome) router.replace('/homes/new');
  }, [hasNoHome, router]);
  return (
    <AppShell activeTab="today">
      {state.kind === 'ready' && <TodayContent state={state} />}
      {state.kind === 'failed' && <TodayProblem message={state.message} retry={state.retry} />}
      {(state.kind === 'loading' || hasNoHome) && (
        <p role="status" className="py-10 text-center text-lg">
          Getting today ready…
        </p>
      )}
    </AppShell>
  );
}
