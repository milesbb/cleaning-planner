'use client';

import { MAX_EFFORT_MINUTES } from '@cleaning-planner/contracts/job';
import type { ReactNode } from 'react';
import { SelectField } from '@/components/ui/select-field';
import { Stepper } from '@/components/ui/stepper';
import type { JobDetails } from '@/lib/home/job-details';
import { effortText } from '@/lib/home/job-wording';
import type { SheetOpening } from '@/lib/lazy-sheet';
import { JobChangeSheet } from './job-change-sheet';
import type { JobAddress } from './use-job-actions';

const MINUTES_STEP = 5;
const FEWEST_MINUTES = 1;

interface JobSheetProps extends SheetOpening {
  details: JobDetails;
  address: JobAddress;
}

// Loaded on first use (`LazySheet`), and fresh each time it opens.
export function JobTimeSheet({ details, address, ...opening }: JobSheetProps): ReactNode {
  return (
    <JobChangeSheet
      {...opening}
      address={address}
      version={details.version}
      title="How long it takes"
      current={details.effortMinutes}
      changeFor={(effortMinutes) => ({ effortMinutes })}
      renderField={(minutes, setMinutes) => (
        <>
          <Stepper
            label="Minutes"
            value={minutes}
            minimum={FEWEST_MINUTES}
            maximum={MAX_EFFORT_MINUTES}
            step={MINUTES_STEP}
            onValueChange={setMinutes}
          />
          <p>{effortText(minutes)}</p>
        </>
      )}
    />
  );
}

// Loaded on first use (`LazySheet`), and fresh each time it opens.
export function JobRoomSheet({ details, address, ...opening }: JobSheetProps): ReactNode {
  return (
    <JobChangeSheet
      {...opening}
      address={address}
      version={details.version}
      title="Move to another room"
      current={details.roomId}
      changeFor={(roomId) => ({ roomId })}
      renderField={(roomId, setRoomId) => (
        <SelectField label="Room" value={roomId} onValueChange={setRoomId}>
          {details.roomChoices.map((room) => (
            <option key={room.value} value={room.value}>
              {room.label}
            </option>
          ))}
        </SelectField>
      )}
    />
  );
}
