interface RetryOptions {
  maxAttempts?: number;
  firstDelayMs?: number;
  wait?: (milliseconds: number) => Promise<void>;
}

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_FIRST_DELAY_MS = 50;

function waitFor(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function retryUntilEmpty<Item>(
  first: Item[],
  attempt: (items: Item[]) => Promise<Item[]>,
  {
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    firstDelayMs = DEFAULT_FIRST_DELAY_MS,
    wait = waitFor,
  }: RetryOptions = {},
): Promise<void> {
  let pending = first;
  for (let attemptNumber = 1; pending.length > 0; attemptNumber += 1) {
    if (attemptNumber > maxAttempts) {
      throw new Error(
        `Still ${String(pending.length)} items to write after ${String(maxAttempts)} attempts`,
      );
    }
    if (attemptNumber > 1) await wait(firstDelayMs * 2 ** (attemptNumber - 2));
    pending = await attempt(pending);
  }
}
