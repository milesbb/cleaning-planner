'use client';

import type { CompletionRecord } from '@cleaning-planner/contracts/completion';
import type { ReactNode } from 'react';
import { TextButton } from '@/components/account/account-screen';
import { useJobHistory } from '@/lib/home/home-queries';
import { JobFact } from './job-fact';
import type { JobAddress } from './use-job-actions';

interface JobHistoryProps {
  address: JobAddress;
  lastDone: string;
  describe: (completion: CompletionRecord) => string;
}

// The last time it was done shows at once; the full list replaces it once loaded.
export function JobHistory({ address, lastDone, describe }: JobHistoryProps): ReactNode {
  const history = useJobHistory(address.householdId, address.jobId);
  const entries = history.data ?? [];
  return (
    <JobFact title="History">
      {entries.length === 0 ? (
        <p className="text-[1.0625rem]">{lastDone}</p>
      ) : (
        <ul aria-label="Times done" className="flex flex-col gap-1 text-[1.0625rem]">
          {entries.map((completion) => (
            <li key={completion.doneAt}>{describe(completion)}</li>
          ))}
        </ul>
      )}
      {history.isError ? (
        <p className="flex flex-wrap items-center gap-x-2">
          Couldn’t get the full history.
          <TextButton onClick={() => void history.refetch()}>Try again</TextButton>
        </p>
      ) : null}
    </JobFact>
  );
}
