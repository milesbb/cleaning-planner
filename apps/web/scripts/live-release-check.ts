import { apiOriginFromPage, hasContentSecurityPolicy } from './live-release.ts';

const DEPLOYMENT_CHECKS = 45;
const DEPLOYMENT_CHECK_INTERVAL_MS = 20_000;
const API_CHECKS = 40;
const API_CHECK_INTERVAL_MS = 30_000;
const HTTP_OK = 200;
const FAILED_DEPLOYMENT_STATES = new Set(['failure', 'error']);
const VERCEL_CONTEXT = 'Vercel';

interface PageAnswer {
  status: number;
  body: string;
}

export interface LiveReleaseDependencies {
  githubJson: (path: string) => Promise<unknown>;
  fetchText: (url: string) => Promise<PageAnswer>;
  wait: (milliseconds: number) => Promise<void>;
  log: (line: string) => void;
}

export interface LiveRelease {
  repository: string;
  siteUrl: string;
  releaseCommit: string;
  routes: readonly string[];
  expectedApiCommit: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Vercel reports each deployment as a "Vercel" commit status, newest first.
async function latestVercelState(
  { githubJson }: LiveReleaseDependencies,
  { repository, releaseCommit }: LiveRelease,
): Promise<string> {
  const statuses: unknown = await githubJson(
    `/repos/${repository}/commits/${releaseCommit}/statuses`,
  );
  const vercel: unknown = Array.isArray(statuses)
    ? statuses.find((status: unknown) => isRecord(status) && status.context === VERCEL_CONTEXT)
    : undefined;
  return isRecord(vercel) && typeof vercel.state === 'string' ? vercel.state : 'not started';
}

async function waitForProductionSite(
  dependencies: LiveReleaseDependencies,
  release: LiveRelease,
): Promise<void> {
  const deploymentName = `Vercel’s production deployment of ${release.releaseCommit}`;
  for (let check = 0; check < DEPLOYMENT_CHECKS; check += 1) {
    const state = await latestVercelState(dependencies, release);
    if (state === 'success') return;
    if (FAILED_DEPLOYMENT_STATES.has(state)) throw new Error(`${deploymentName} failed (${state})`);
    await dependencies.wait(DEPLOYMENT_CHECK_INTERVAL_MS);
  }
  throw new Error(`${deploymentName} did not finish in time`);
}

function problemWith(route: string, page: PageAnswer): string | null {
  if (page.status !== HTTP_OK) return `${route} answered ${String(page.status)}`;
  if (!hasContentSecurityPolicy(page.body)) return `${route} has no Content-Security-Policy`;
  return null;
}

async function checkPages(
  { fetchText }: LiveReleaseDependencies,
  siteUrl: string,
  routes: readonly string[],
): Promise<string> {
  const pages = await Promise.all(routes.map((route) => fetchText(`${siteUrl}${route}`)));
  const problems = routes.flatMap((route, index) => {
    const page = pages[index];
    const problem = page === undefined ? `${route} gave no answer` : problemWith(route, page);
    return problem === null ? [] : [problem];
  });
  if (problems.length > 0) throw new Error(`Live pages are broken: ${problems.join('; ')}`);
  return pages[0]?.body ?? '';
}

async function reportedApiVersion(
  { fetchText }: LiveReleaseDependencies,
  apiOrigin: string,
): Promise<string> {
  const answer = await fetchText(`${apiOrigin}/v1/health`);
  const health: unknown = answer.status === HTTP_OK ? JSON.parse(answer.body) : null;
  return isRecord(health) && typeof health.version === 'string'
    ? health.version
    : `no answer (${String(answer.status)})`;
}

async function waitForApiVersion(
  dependencies: LiveReleaseDependencies,
  apiOrigin: string,
  expectedCommit: string,
): Promise<void> {
  let version = '';
  for (let check = 0; check < API_CHECKS; check += 1) {
    version = await reportedApiVersion(dependencies, apiOrigin);
    if (version === expectedCommit) {
      dependencies.log(`The API reports ${expectedCommit}`);
      return;
    }
    await dependencies.wait(API_CHECK_INTERVAL_MS);
  }
  throw new Error(`The API still reports ${version}, not ${expectedCommit}`);
}

// After a release: the website is live on every page with its policy, and the
// API runs the commit it should.
export async function checkLiveRelease(
  dependencies: LiveReleaseDependencies,
  release: LiveRelease,
): Promise<void> {
  await waitForProductionSite(dependencies, release);
  dependencies.log(`Vercel deployed ${release.releaseCommit}`);
  const homePage = await checkPages(dependencies, release.siteUrl, release.routes);
  dependencies.log(`All ${String(release.routes.length)} pages answer with their policy`);
  await waitForApiVersion(dependencies, apiOriginFromPage(homePage), release.expectedApiCommit);
}
