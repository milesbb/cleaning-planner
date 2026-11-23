'use client';

import { MAX_EFFORT_MINUTES } from '@cleaning-planner/contracts/job';
import type { ReactNode } from 'react';
import { SelectField } from '@/components/ui/select-field';
import { Stepper } from '@/components/ui/stepper';
import type { JobDetails } from '@/lib/home/job-details';
import { effortText } from '@/lib/home/job-wording';
import { JobChangeSheet } from './job-change-sheet';
import { JobFact } from './job-fact';
import type { JobAddress } from './use-job-actions';

const MINUTES_STEP = 5;
const FEWEST_MINUTES = 1;

interface JobFactProps {
  details: JobDetails;
  address: JobAddress;
}

export function JobTimeFact({ details, address }: JobFactProps): ReactNode {
  return (
    <JobFact title="How long it takes">
      <p className="text-[1.0625rem]">{effortText(details.effortMinutes)}</p>
      <JobChangeSheet
        address={address}
        version={details.version}
        title="How long it takes"
        trigger="Change how long it takes"
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
    </JobFact>
  );
}

export function JobRoomFact({ details, address }: JobFactProps): ReactNode {
  return (
    <JobFact title="Room">
      <p className="text-[1.0625rem]">{details.roomName}</p>
      <JobChangeSheet
        address={address}
        version={details.version}
        title="Move to another room"
        trigger="Move to another room"
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
    </JobFact>
  );
}
