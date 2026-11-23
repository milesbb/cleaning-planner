import { createContext, use } from 'react';

export interface RefusedChange {
  message: string | null;
  dismiss: () => void;
}

const NOTHING_REFUSED: RefusedChange = { message: null, dismiss: () => undefined };

export const RefusedChangeContext = createContext<RefusedChange>(NOTHING_REFUSED);

// The latest change made offline that the API refused when it was finally sent.
export function useRefusedChange(): RefusedChange {
  return use(RefusedChangeContext);
}
