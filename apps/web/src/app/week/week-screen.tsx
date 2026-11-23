'use client';

import { Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons/interface-icons';
import { AppShell } from '@/components/shell/app-shell';
import { HomeSwitcher } from '@/components/shell/home-switcher';
import { PageHeader } from '@/components/shell/page-header';
import {
  ScreenLoading,
  ScreenProblem,
  useStartAHomeWhenHomeless,
} from '@/components/shell/screen-states';
import { TwoColumns } from '@/components/shell/two-columns';
import { IconButton } from '@/components/ui/icon-button';
import { formatShortDate } from '@/lib/format-date';
import { ComingUpSection } from './coming-up-section';
import { useWeek } from './use-week';
import { WeekDays } from './week-days';
import type { WeekState } from './use-week';

// Laptops only, so phones never download it.
const ChooseAJobHint = lazy(async () => ({
  default: (await import('@/components/shell/choose-a-job-hint')).ChooseAJobHint,
}));

type ReadyWeek = Extract<WeekState, { kind: 'ready' }>;

function subtitleFor({ range, view }: ReadyWeek): string {
  const dates = `${formatShortDate(range.from)} – ${formatShortDate(range.to)}`;
  if (view.progress.total === 0) return `${dates} · nothing planned`;
  return `${dates} · ${String(view.progress.done)} of ${String(view.progress.total)} done`;
}

function WeekNavigation({ week }: { week: ReadyWeek }): ReactNode {
  return (
    <div className="flex items-center gap-2">
      <IconButton
        label="Previous week"
        icon={<ChevronLeftIcon />}
        onClick={() => {
          week.showWeek(week.offset - 1);
        }}
      />
      <IconButton
        label="Next week"
        icon={<ChevronRightIcon />}
        onClick={() => {
          week.showWeek(week.offset + 1);
        }}
      />
    </div>
  );
}

function WeekLists({ week }: { week: ReadyWeek }): ReactNode {
  return (
    <>
      <WeekDays
        householdId={week.currentHomeId}
        today={week.today}
        range={week.range}
        view={week.view}
      />
      {week.offset === 0 ? (
        <ComingUpSection householdId={week.currentHomeId} week={week.range} />
      ) : null}
    </>
  );
}

function WeekContent({ week }: { week: ReadyWeek }): ReactNode {
  return (
    <>
      <PageHeader
        title={week.title}
        subtitle={subtitleFor(week)}
        leading={
          <HomeSwitcher
            homes={week.homes}
            currentHomeId={week.currentHomeId}
            onSwitch={week.switchHome}
          />
        }
        action={<WeekNavigation week={week} />}
      />
      <TwoColumns
        main={<WeekLists week={week} />}
        side={
          <Suspense fallback={null}>
            <ChooseAJobHint />
          </Suspense>
        }
        sideLabel="Job details"
        sideBelowLaptop="hidden"
      />
    </>
  );
}

export function WeekScreen(): ReactNode {
  const week = useWeek();
  const hasNoHome = week.kind === 'noHome';
  useStartAHomeWhenHomeless(hasNoHome);
  return (
    <AppShell activeTab="week" layout="split">
      {week.kind === 'ready' && <WeekContent week={week} />}
      {week.kind === 'failed' && (
        <ScreenProblem title="This week" message={week.message} retry={week.retry} />
      )}
      {(week.kind === 'loading' || hasNoHome) && (
        <ScreenLoading>Getting the week ready…</ScreenLoading>
      )}
    </AppShell>
  );
}
