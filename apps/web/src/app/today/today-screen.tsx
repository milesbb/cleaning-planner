'use client';

import { Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { FormAlert } from '@/components/account/account-screen';
import { AppShell } from '@/components/shell/app-shell';
import { HomeSwitcher } from '@/components/shell/home-switcher';
import { PageHeader } from '@/components/shell/page-header';
import {
  ScreenLoading,
  ScreenProblem,
  useStartAHomeWhenHomeless,
} from '@/components/shell/screen-states';
import { TwoColumns } from '@/components/shell/two-columns';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { formatDayHeading } from '@/lib/format-date';
import { AllDone, DoneList, DueList, TomorrowList } from './today-sections';
import { useToday } from './use-today';
import type { TodayFilter, TodayState } from './use-today';

// Laptops only, so phones never download it.
const WeekStrip = lazy(async () => ({ default: (await import('./week-strip')).WeekStrip }));

type ReadyToday = Extract<TodayState, { kind: 'ready' }>;

const FILTERS = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'justMe', label: 'Just me' },
] as const satisfies readonly { value: TodayFilter; label: string }[];

function subtitleFor({ today, view }: ReadyToday): string {
  const workLeft = view.minutesLeft === 0 ? 'all done' : `about ${String(view.minutesLeft)} min`;
  return `${formatDayHeading(today)} · ${workLeft}`;
}

function TodayLists({ state }: { state: ReadyToday }): ReactNode {
  const { view, progress } = state;
  const isAllDone = view.late.length === 0 && view.today.length === 0;
  return (
    <>
      <SegmentedControl<TodayFilter>
        label="Show jobs for"
        options={FILTERS}
        value={state.filter}
        onValueChange={state.setFilter}
        className="sm:max-w-sm"
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

function TodayContent({ state }: { state: ReadyToday }): ReactNode {
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
      <TwoColumns
        main={<TodayLists state={state} />}
        side={
          <Suspense fallback={null}>
            <WeekStrip householdId={state.currentHomeId} />
          </Suspense>
        }
        sideLabel="This week"
        sideBelowLaptop="hidden"
      />
    </>
  );
}

export function TodayScreen(): ReactNode {
  const state = useToday();
  const hasNoHome = state.kind === 'noHome';
  useStartAHomeWhenHomeless(hasNoHome);
  return (
    <AppShell activeTab="today" layout="split">
      {state.kind === 'ready' && <TodayContent state={state} />}
      {state.kind === 'failed' && (
        <ScreenProblem title="Today" message={state.message} retry={state.retry} />
      )}
      {(state.kind === 'loading' || hasNoHome) && (
        <ScreenLoading>Getting today ready…</ScreenLoading>
      )}
    </AppShell>
  );
}
