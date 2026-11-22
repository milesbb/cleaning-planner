'use client';

import { householdSummarySchema } from '@cleaning-planner/contracts/household';
import { z } from '@cleaning-planner/contracts/zod';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useApiClient } from '../../lib/api/api-provider';
import { startRouteFor } from '../../lib/navigation/start-route';
import type { StartRoute } from '../../lib/navigation/start-route';

const homesSchema = z.array(householdSummarySchema);

interface StartRedirectProps {
  isSignedIn: () => Promise<boolean>;
  goTo: (route: StartRoute) => void;
}

function useStartRoute(
  isSignedIn: () => Promise<boolean>,
): ReturnType<typeof useQuery<StartRoute>> {
  const client = useApiClient();
  return useQuery({
    queryKey: ['start-route'],
    // Never reuse an answer from before a log in or log out.
    gcTime: 0,
    queryFn: async (): Promise<StartRoute> => {
      if (!(await isSignedIn())) return startRouteFor({ isSignedIn: false, homeCount: 0 });
      const homes = await client.request({
        method: 'GET',
        path: '/v1/households',
        response: homesSchema,
      });
      return startRouteFor({ isSignedIn: true, homeCount: homes.length });
    },
  });
}

export function StartRedirect({ isSignedIn, goTo }: StartRedirectProps): ReactNode {
  const startRoute = useStartRoute(isSignedIn);
  useEffect(() => {
    if (startRoute.data !== undefined) goTo(startRoute.data);
  }, [startRoute.data, goTo]);
  if (startRoute.isError) {
    return (
      <p role="alert" className="p-4">
        {startRoute.error.message}
      </p>
    );
  }
  return (
    <p role="status" className="p-4">
      Getting your homes ready…
    </p>
  );
}
