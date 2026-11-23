'use client';

import { Suspense, lazy, useRef } from 'react';
import type { MouseEvent, ReactNode, RefObject } from 'react';
import { jobIdOfPlainClick } from './job-links';
import { useIsLaptop } from './use-is-laptop';
import { useFocusBackToJob, useJobPageBelowLaptop, useOpenJob } from './use-open-job';

// Loaded the first time a job opens beside a list, so no page's first load
// carries Job detail.
const JobPanel = lazy(async () => ({ default: (await import('@/app/job/job-panel')).JobPanel }));

interface TwoColumnsProps {
  main: ReactNode;
  side: ReactNode;
  sideLabel: string;
  sideBelowLaptop?: 'stacked' | 'hidden';
}

const JOB_DETAILS_LABEL = 'Job details';

// docs/LAYOUTS.md §2.4. The side column keeps a little padding inside its own
// scroll area so focus outlines on its edges aren't clipped.
const COLUMNS_CLASSES =
  'flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-10';

const SIDE_CLASSES =
  'flex min-w-0 flex-col gap-4 lg:sticky lg:top-8 lg:-m-1.5 lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:p-1.5';

interface JobsBesideList {
  panelJobId: string | null;
  catchJobLinks: ((event: MouseEvent) => void) | undefined;
  closePanel: () => void;
}

// On a laptop a job link in the main column opens Job detail in the side
// column instead of leaving the list (docs/LAYOUTS.md §3).
function useJobsBesideList(
  isLaptop: boolean,
  mainRef: RefObject<HTMLElement | null>,
): JobsBesideList {
  const openJob = useOpenJob();
  const panelJobId = isLaptop ? openJob.jobId : null;
  useJobPageBelowLaptop(isLaptop, openJob.jobId);
  useFocusBackToJob(mainRef, panelJobId);
  const openJobFromLink = (event: MouseEvent): void => {
    const jobId = jobIdOfPlainClick(event);
    if (jobId === null) return;
    event.preventDefault();
    openJob.open(jobId);
  };
  return {
    panelJobId,
    catchJobLinks: isLaptop ? openJobFromLink : undefined,
    closePanel: openJob.close,
  };
}

interface SideColumnProps {
  side: ReactNode;
  sideLabel: string;
  panelJobId: string | null;
  closePanel: () => void;
}

function SideColumn({ side, sideLabel, panelJobId, closePanel }: SideColumnProps): ReactNode {
  return (
    <section
      aria-label={panelJobId === null ? sideLabel : JOB_DETAILS_LABEL}
      className={SIDE_CLASSES}
    >
      {panelJobId === null ? (
        side
      ) : (
        <Suspense fallback={null}>
          <JobPanel jobId={panelJobId} onClose={closePanel} />
        </Suspense>
      )}
    </section>
  );
}

export function TwoColumns({
  main,
  side,
  sideLabel,
  sideBelowLaptop = 'stacked',
}: TwoColumnsProps): ReactNode {
  const isLaptop = useIsLaptop();
  const mainRef = useRef<HTMLDivElement>(null);
  const { panelJobId, catchJobLinks, closePanel } = useJobsBesideList(isLaptop, mainRef);
  const showsSide = isLaptop || sideBelowLaptop === 'stacked';
  return (
    <div className={COLUMNS_CLASSES}>
      <div ref={mainRef} onClickCapture={catchJobLinks} className="flex min-w-0 flex-col gap-4">
        {main}
      </div>
      {showsSide ? (
        <SideColumn
          side={side}
          sideLabel={sideLabel}
          panelJobId={panelJobId}
          closePanel={closePanel}
        />
      ) : null}
    </div>
  );
}
