'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { jobHref } from '@/lib/home/job-href';
import { changeAddressRecordId, useAddressRecordId } from '@/lib/navigation/address-record-id';
import { linkToJob } from './job-links';

const JOB_PARAMETER = 'job';

export interface OpenJob {
  jobId: string | null;
  open: (jobId: string) => void;
  close: () => void;
}

// The job open beside a list, kept in the list's address (`/today?job=…`) so
// Back closes it and the address can be shared (docs/LAYOUTS.md §3). Opening
// another job replaces the first, so Back doesn't step through every one.
export function useOpenJob(): OpenJob {
  const jobId = useAddressRecordId(JOB_PARAMETER);
  const wasOpenedHere = useRef(false);
  return {
    jobId,
    open: (nextJobId): void => {
      if (nextJobId === jobId) return;
      changeAddressRecordId(JOB_PARAMETER, nextJobId, jobId === null ? 'push' : 'replace');
      wasOpenedHere.current = true;
    },
    close: (): void => {
      if (wasOpenedHere.current) {
        wasOpenedHere.current = false;
        window.history.back();
        return;
      }
      changeAddressRecordId(JOB_PARAMETER, null, 'replace');
    },
  };
}

// Phones have no room beside the list: a job in the address (a shared link,
// or a window narrowed while one was open) becomes its own page.
export function useJobPageBelowLaptop(isLaptop: boolean, jobId: string | null): void {
  const router = useRouter();
  useEffect(() => {
    if (!isLaptop && jobId !== null) router.replace(jobHref(jobId));
  }, [isLaptop, jobId, router]);
}

// When the panel closes, focus goes back to the job's row, or to the page's
// heading if the row has gone (the job was done or removed).
export function useFocusBackToJob(
  list: RefObject<HTMLElement | null>,
  panelJobId: string | null,
): void {
  const shownJobId = useRef<string | null>(null);
  useEffect(() => {
    const closedJobId = shownJobId.current;
    shownJobId.current = panelJobId;
    if (closedJobId === null || panelJobId !== null) return;
    const row = linkToJob(list.current, closedJobId);
    const pageHeading = document.querySelector<HTMLElement>('main h1, h1');
    (row ?? pageHeading)?.focus();
  }, [list, panelJobId]);
}
