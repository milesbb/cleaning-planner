'use client';

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
import { IconButton } from '@/components/ui/icon-button';
import { formatShortDate } from '@/lib/format-date';
import { ComingUpSection } from './coming-up-section';
import { useWeek } from './use-week';
import { WeekDays } from './week-days';
import type { WeekState } from './use-week';

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

export function WeekScreen(): ReactNode {
  const week = useWeek();
  const hasNoHome = week.kind === 'noHome';
  useStartAHomeWhenHomeless(hasNoHome);
  return (
    <AppShell activeTab="week">
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
