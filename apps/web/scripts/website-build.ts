const WEBSITE_FOLDERS = ['apps/web/', 'packages/schedule/', 'packages/contracts/'];
const WEBSITE_ROOT_FILES = [
  'package.json',
  'package-lock.json',
  'turbo.json',
  'tsconfig.base.json',
];
const NOTES_EXTENSION = '.md';
const PRODUCTION = 'production';

export type ChangedPaths =
  { found: true; paths: readonly string[] } | { found: false; problem: string };

export interface VercelDeployment {
  environment: string | undefined;
}

export interface BuildDecision {
  shouldBuild: boolean;
  reason: string;
}

function isWebsiteSource(path: string): boolean {
  if (path.endsWith(NOTES_EXTENSION)) return false;
  return (
    WEBSITE_ROOT_FILES.includes(path) || WEBSITE_FOLDERS.some((folder) => path.startsWith(folder))
  );
}

export function affectsWebsite(changedPaths: readonly string[]): boolean {
  return changedPaths.some(isWebsiteSource);
}

export function decideWebsiteBuild(
  deployment: VercelDeployment,
  findChangedPaths: () => ChangedPaths,
): BuildDecision {
  if (deployment.environment === undefined) {
    return { shouldBuild: true, reason: 'VERCEL_ENV is not set, so building.' };
  }
  if (deployment.environment === PRODUCTION) {
    return { shouldBuild: true, reason: 'Production is always built.' };
  }
  const changes = findChangedPaths();
  if (!changes.found) {
    return {
      shouldBuild: true,
      reason: `Could not tell what this branch changes (${changes.problem}), so building.`,
    };
  }
  if (affectsWebsite(changes.paths)) {
    return { shouldBuild: true, reason: 'This branch changes files the website is built from.' };
  }
  return {
    shouldBuild: false,
    reason: 'Nothing the website is built from changed, so there is nothing new to preview.',
  };
}
