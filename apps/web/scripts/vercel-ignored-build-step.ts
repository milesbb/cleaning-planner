import { execFileSync } from 'node:child_process';
import { vercelBranchChanges } from './branch-changes.ts';
import { decideWebsiteBuild } from './website-build.ts';

const SKIP_BUILD = 0;
const BUILD = 1;

function git(gitArguments: readonly string[]): string {
  return execFileSync('git', gitArguments, { encoding: 'utf8' });
}

const decision = decideWebsiteBuild({ environment: process.env.VERCEL_ENV }, () =>
  vercelBranchChanges(git, process.env),
);
process.stdout.write(`${decision.reason}\n`);
process.exitCode = decision.shouldBuild ? BUILD : SKIP_BUILD;
