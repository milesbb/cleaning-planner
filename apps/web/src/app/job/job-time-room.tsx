'use client';

import type { ReactNode } from 'react';
import type { JobDetails } from '@/lib/home/job-details';
import { effortText } from '@/lib/home/job-wording';
import { LazySheet } from '@/lib/lazy-sheet';
import { JobFact } from './job-fact';
import { JobRoomSheet, JobTimeSheet, TextActionTrigger } from './job-sheets';
import type { JobAddress } from './use-job-actions';

interface JobFactProps {
  details: JobDetails;
  address: JobAddress;
}

export function JobTimeFact({ details, address }: JobFactProps): ReactNode {
  return (
    <JobFact title="How long it takes">
      <p className="text-[1.0625rem]">{effortText(details.effortMinutes)}</p>
      <LazySheet
        trigger={(triggerProps) => (
          <TextActionTrigger label="Change how long it takes" triggerProps={triggerProps} />
        )}
        sheet={(opening) => <JobTimeSheet {...opening} details={details} address={address} />}
      />
    </JobFact>
  );
}

export function JobRoomFact({ details, address }: JobFactProps): ReactNode {
  return (
    <JobFact title="Room">
      <p className="text-[1.0625rem]">{details.roomName}</p>
      <LazySheet
        trigger={(triggerProps) => (
          <TextActionTrigger label="Move to another room" triggerProps={triggerProps} />
        )}
        sheet={(opening) => <JobRoomSheet {...opening} details={details} address={address} />}
      />
    </JobFact>
  );
}
