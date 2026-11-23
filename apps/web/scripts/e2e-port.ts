export const DEFAULT_E2E_PORT = 3000;
const LOWEST_UNPRIVILEGED_PORT = 1024;
const HIGHEST_PORT = 65_535;
const WHOLE_NUMBER = /^\d+$/;

function isAllowedPort(port: number): boolean {
  return port >= LOWEST_UNPRIVILEGED_PORT && port <= HIGHEST_PORT;
}

export function e2ePort(requestedPort: string | undefined): number {
  if (requestedPort === undefined || requestedPort === '') {
    return DEFAULT_E2E_PORT;
  }
  const port = Number(requestedPort);
  if (!WHOLE_NUMBER.test(requestedPort) || !isAllowedPort(port)) {
    throw new Error(
      `E2E_PORT must be a whole number from ${String(LOWEST_UNPRIVILEGED_PORT)} to ${String(HIGHEST_PORT)}, but it is "${requestedPort}".`,
    );
  }
  return port;
}
