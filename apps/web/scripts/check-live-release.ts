import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { setTimeout as wait } from 'node:timers/promises';
import { checkLiveRelease } from './live-release-check.ts';
import {
  LIVE_SITE_URL,
  backendPathspecs,
  expectedApiCommit,
  liveRoutesFrom,
} from './live-release.ts';

const REQUEST_TIMEOUT_MS = 15_000;

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') throw new Error(`${name} must be set`);
  return value;
}

function git(...gitArguments: string[]): string {
  return execFileSync('git', gitArguments, { encoding: 'utf8' }).trim();
}

const releaseCommit = requiredEnvironment('RELEASE_COMMIT');
const previousRelease = requiredEnvironment('PREVIOUS_RELEASE');
const githubToken = requiredEnvironment('GITHUB_TOKEN');

await checkLiveRelease(
  {
    githubJson: async (path) => {
      const response = await fetch(`https://api.github.com${path}`, {
        headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${githubToken}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`GitHub answered ${String(response.status)} for ${path}`);
      const body: unknown = await response.json();
      return body;
    },
    fetchText: async (url) => {
      const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      return { status: response.status, body: await response.text() };
    },
    wait: (milliseconds) => wait(milliseconds),
    log: (line) => process.stdout.write(`${line}\n`),
  },
  {
    repository: requiredEnvironment('GITHUB_REPOSITORY'),
    siteUrl: LIVE_SITE_URL,
    releaseCommit,
    routes: liveRoutesFrom(
      readdirSync('src/app', { recursive: true, encoding: 'utf8' }).map(
        (file) => `src/app/${file}`,
      ),
    ),
    expectedApiCommit: expectedApiCommit({
      changedFiles: git('diff', '--name-only', previousRelease, releaseCommit).split('\n'),
      releaseCommit,
      lastBackendRelease: git(
        'log',
        '-1',
        '--first-parent',
        '--format=%H',
        releaseCommit,
        '--',
        ...backendPathspecs(),
      ),
    }),
  },
);
