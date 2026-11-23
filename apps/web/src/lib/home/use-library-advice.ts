'use client';

import { useEffect, useState } from 'react';
import { NO_ADVICE } from './job-advice';
import type { JobAdvice } from './job-advice';

interface LoadedAdvice {
  libraryId: string | null;
  advice: JobAdvice;
}

// The library's advice for a job, fetched with the library the first time it's needed.
export function useLibraryAdvice(libraryId: string | null): JobAdvice {
  const [loaded, setLoaded] = useState<LoadedAdvice | null>(null);
  useEffect(() => {
    if (libraryId === null) return undefined;
    let isCurrent = true;
    void import('./library-advice').then(({ adviceFor }) => {
      if (isCurrent) setLoaded({ libraryId, advice: adviceFor(libraryId) });
    });
    return (): void => {
      isCurrent = false;
    };
  }, [libraryId]);
  return loaded !== null && loaded.libraryId === libraryId ? loaded.advice : NO_ADVICE;
}
