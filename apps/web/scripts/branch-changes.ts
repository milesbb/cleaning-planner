import type { ChangedPaths } from './website-build.ts';

// Vercel clones only the last few commits of the pushed branch, so both
// histories are fetched deep enough to reach the commit they share.
const HISTORY_DEPTH = 200;
const DEVELOPMENT_COPY = 'refs/remotes/website-check/development';

export interface BranchCommit {
  repositoryUrl: string;
  commitSha: string;
}

type GitRunner = (gitArguments: readonly string[]) => string;

type VercelEnvironment = Readonly<Record<string, string | undefined>>;

function problemFrom(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function changedPathsSinceDevelopment(
  runGit: GitRunner,
  commit: BranchCommit,
): ChangedPaths {
  try {
    runGit([
      'fetch',
      '--quiet',
      `--depth=${String(HISTORY_DEPTH)}`,
      commit.repositoryUrl,
      `+refs/heads/development:${DEVELOPMENT_COPY}`,
      commit.commitSha,
    ]);
    const diff = runGit(['diff', '--name-only', `${DEVELOPMENT_COPY}...${commit.commitSha}`]);
    return { found: true, paths: diff.split('\n').filter((path) => path !== '') };
  } catch (error) {
    return { found: false, problem: problemFrom(error) };
  }
}

function commitFrom(environment: VercelEnvironment): BranchCommit | undefined {
  const owner = environment.VERCEL_GIT_REPO_OWNER;
  const repository = environment.VERCEL_GIT_REPO_SLUG;
  const commitSha = environment.VERCEL_GIT_COMMIT_SHA;
  if (!owner || !repository || !commitSha) return undefined;
  return { repositoryUrl: `https://github.com/${owner}/${repository}.git`, commitSha };
}

export function vercelBranchChanges(
  runGit: GitRunner,
  environment: VercelEnvironment,
): ChangedPaths {
  const commit = commitFrom(environment);
  if (commit === undefined) {
    return { found: false, problem: 'Vercel did not say which repository and commit this is' };
  }
  return changedPathsSinceDevelopment(runGit, commit);
}
