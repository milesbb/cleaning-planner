import { describe, expect, it } from 'vitest';
import {
  changedPathsSinceDevelopment,
  vercelBranchChanges,
  type BranchCommit,
} from './branch-changes.ts';

const commit: BranchCommit = {
  repositoryUrl: 'https://github.com/example/cleaning-planner.git',
  commitSha: 'abc123',
};

interface FakeGit {
  runGit: (gitArguments: readonly string[]) => string;
  calls: (readonly string[])[];
}

function gitAnswering(diffOutput: string): FakeGit {
  const calls: (readonly string[])[] = [];
  return {
    calls,
    runGit: (gitArguments: readonly string[]): string => {
      calls.push(gitArguments);
      return gitArguments[0] === 'diff' ? diffOutput : '';
    },
  };
}

describe('changedPathsSinceDevelopment', () => {
  it('lists the files changed since the branch left development', () => {
    const git = gitAnswering('apps/api/src/app.ts\ndocs/PLAN.md\n');

    expect(changedPathsSinceDevelopment(git.runGit, commit)).toEqual({
      found: true,
      paths: ['apps/api/src/app.ts', 'docs/PLAN.md'],
    });
  });

  it('fetches enough of development and of the commit to find where they split', () => {
    const git = gitAnswering('');

    changedPathsSinceDevelopment(git.runGit, commit);

    expect(git.calls).toEqual([
      [
        'fetch',
        '--quiet',
        '--depth=200',
        commit.repositoryUrl,
        '+refs/heads/development:refs/remotes/website-check/development',
        commit.commitSha,
      ],
      ['diff', '--name-only', 'refs/remotes/website-check/development...abc123'],
    ]);
  });

  it('finds no paths when the branch changes nothing', () => {
    expect(changedPathsSinceDevelopment(gitAnswering('\n').runGit, commit)).toEqual({
      found: true,
      paths: [],
    });
  });

  it('reports the problem when git fails', () => {
    const failingGit = (): string => {
      throw new Error('fatal: no merge base');
    };

    expect(changedPathsSinceDevelopment(failingGit, commit)).toEqual({
      found: false,
      problem: 'fatal: no merge base',
    });
  });
});

describe('vercelBranchChanges', () => {
  it('compares the commit Vercel is deploying, fetched from the repository it came from', () => {
    const git = gitAnswering('apps/api/src/app.ts\n');

    const changes = vercelBranchChanges(git.runGit, {
      VERCEL_GIT_REPO_OWNER: 'example',
      VERCEL_GIT_REPO_SLUG: 'cleaning-planner',
      VERCEL_GIT_COMMIT_SHA: 'abc123',
    });

    expect(changes).toEqual({ found: true, paths: ['apps/api/src/app.ts'] });
    expect(git.calls[0]).toContain('https://github.com/example/cleaning-planner.git');
    expect(git.calls[0]).toContain('abc123');
  });

  it.each(['VERCEL_GIT_REPO_OWNER', 'VERCEL_GIT_REPO_SLUG', 'VERCEL_GIT_COMMIT_SHA'])(
    'cannot tell what changed when %s is missing',
    (missingName) => {
      const environment = {
        VERCEL_GIT_REPO_OWNER: 'example',
        VERCEL_GIT_REPO_SLUG: 'cleaning-planner',
        VERCEL_GIT_COMMIT_SHA: 'abc123',
        [missingName]: undefined,
      };

      expect(vercelBranchChanges(gitAnswering('').runGit, environment)).toEqual({
        found: false,
        problem: 'Vercel did not say which repository and commit this is',
      });
    },
  );
});
