'use client';

import { jobSchema } from '@cleaning-planner/contracts/job';
import type { Job } from '@cleaning-planner/contracts/job';
import type { CreateJobRequest } from '@cleaning-planner/contracts/job-request';
import { scheduleSchema } from '@cleaning-planner/contracts/schedule';
import type { LibraryJob } from '@cleaning-planner/schedule/library/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api/api-provider';
import { homePath } from '@/lib/home/home-queries';

// A library job as it's added: its usual timing and effort, for anyone.
export function requestForLibraryJob(roomId: string, libraryJob: LibraryJob): CreateJobRequest {
  return {
    roomId,
    libraryId: libraryJob.id,
    name: libraryJob.name,
    icon: libraryJob.icon,
    schedule: scheduleSchema.parse(libraryJob.defaultSchedule),
    assignment: { kind: 'anyone' },
    effortMinutes: libraryJob.effortMinutes,
  };
}

// No idempotency key on adding a job, so a retry after a lost answer could
// add it twice: it never retries on its own.
export function useAddJob(householdId: string): UseMutationResult<Job, Error, CreateJobRequest> {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: (job: CreateJobRequest) =>
      client.request({
        method: 'POST',
        path: `${homePath(householdId)}/jobs`,
        body: job,
        response: jobSchema,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['home', householdId] }),
  });
}
