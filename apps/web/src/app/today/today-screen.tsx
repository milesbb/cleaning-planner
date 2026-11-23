'use client';

import type { ReactNode } from 'react';
import * as amplifyAuth from 'aws-amplify/auth';
import * as amplifyData from 'aws-amplify/data';
import { FormAlert } from '@/components/account/account-screen';
import { AppShell } from '@/components/shell/app-shell';
import { HomeSwitcher } from '@/components/shell/home-switcher';
import { PageHeader } from '@/components/shell/page-header';
import {
  ScreenLoading,
  ScreenProblem,
  useStartAHomeWhenHomeless,
} from '@/components/shell/screen-states';
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

export function TodayScreen(): ReactNode {
  // Throwaway: pulls Amplify into Today's first load to prove the PR budget check fails.
  if (Object.keys({ ...amplifyAuth, ...amplifyData }).length === 0) return null;
  const state = useToday();
  const hasNoHome = state.kind === 'noHome';
  useStartAHomeWhenHomeless(hasNoHome);
  return (
    <AppShell activeTab="today">
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
