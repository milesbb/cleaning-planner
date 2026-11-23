'use client';

import type { LibraryJob } from '@cleaning-planner/schedule/library/types';
import { useEffect, useState } from 'react';

// The job library, fetched after the screen shows so its text isn't part of
// the page's first load. Null until it arrives.
export function useJobLibrary(): readonly LibraryJob[] | null {
  const [library, setLibrary] = useState<readonly LibraryJob[] | null>(null);
  useEffect(() => {
    let isCurrent = true;
    void import('@cleaning-planner/schedule/library/job-library').then(({ JOB_LIBRARY }) => {
      if (isCurrent) setLibrary(JOB_LIBRARY);
    });
    return (): void => {
      isCurrent = false;
    };
  }, []);
  return library;
}
