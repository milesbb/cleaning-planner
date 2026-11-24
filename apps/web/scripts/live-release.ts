import { COGNITO_ORIGIN, contentSecurityPolicyOf } from './content-security-policy.ts';

// The production website; template.yml's AllowedOrigins must list it (tested).
export const LIVE_SITE_URL = 'https://cleaning-planner-coral.vercel.app';
const PAGE_FILE = /^src\/app\/(?:(.+)\/)?page\.tsx$/;
const CONNECT_SOURCES = /connect-src ([^;]+)/;

// The paths that start the backend pipeline (its trigger in infrastructure/template.yml;
// a test keeps the two the same).
export const BACKEND_PATHS = [
  'apps/api/**',
  'packages/contracts/**',
  'packages/schedule/**',
  'infrastructure/**',
  'package.json',
  'package-lock.json',
  'tsconfig.base.json',
] as const;

export function liveRoutesFrom(appFiles: readonly string[]): string[] {
  const routes = appFiles.flatMap((file) => {
    const match = PAGE_FILE.exec(file.replaceAll('\\', '/'));
    if (match === null) return [];
    const folder = match[1];
    return [folder === undefined ? '/' : `/${folder}/`];
  });
  return routes.sort();
}

export function hasContentSecurityPolicy(html: string): boolean {
  return contentSecurityPolicyOf(html) !== null;
}

export function apiOriginFromPage(html: string): string {
  const connectSources = CONNECT_SOURCES.exec(contentSecurityPolicyOf(html) ?? '')?.[1] ?? '';
  const apiOrigin = connectSources
    .split(' ')
    .find((source) => source.startsWith('https://') && source !== COGNITO_ORIGIN);
  if (apiOrigin === undefined) throw new Error('The live page names no API address');
  return apiOrigin;
}

// For git log: anchored to the top of the repository, because the check runs
// in apps/web, where a bare package.json would be the website's own.
export function backendPathspecs(): string[] {
  return BACKEND_PATHS.map((path) => `:(top)${path.replace(/\/\*\*$/, '')}`);
}

function matchesBackendPath(file: string, backendPath: string): boolean {
  if (backendPath.endsWith('/**')) return file.startsWith(backendPath.slice(0, -'**'.length));
  return file === backendPath;
}

export function releaseTouchesBackend(changedFiles: readonly string[]): boolean {
  return changedFiles.some((file) =>
    BACKEND_PATHS.some((backendPath) => matchesBackendPath(file, backendPath)),
  );
}

export interface ReleaseCommits {
  changedFiles: readonly string[];
  releaseCommit: string;
  lastBackendRelease: string;
}

// The pipeline only runs for backend changes, so a website-only release leaves
// the API on the last release that changed the backend.
export function expectedApiCommit({
  changedFiles,
  releaseCommit,
  lastBackendRelease,
}: ReleaseCommits): string {
  return releaseTouchesBackend(changedFiles) ? releaseCommit : lastBackendRelease;
}
