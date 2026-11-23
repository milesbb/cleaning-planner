import { execFileSync } from 'node:child_process';
import * as zod from 'zod/mini';
import type { Issue } from './issues.ts';

const MOST_OPEN_ISSUES = '500';

const ghIssuesSchema = zod.array(
  zod.object({
    number: zod.number(),
    title: zod.string(),
    body: zod.string(),
    labels: zod.array(zod.object({ name: zod.string() })),
  }),
);

function runGh(args: readonly string[]): string {
  return execFileSync('gh', args, { encoding: 'utf8' });
}

export function readOpenIssues(): Issue[] {
  const output = runGh([
    'issue',
    'list',
    '--state',
    'open',
    '--limit',
    MOST_OPEN_ISSUES,
    '--json',
    'number,title,labels,body',
  ]);
  return ghIssuesSchema.parse(JSON.parse(output)).map((listed) => ({
    number: listed.number,
    title: listed.title,
    body: listed.body,
    labels: listed.labels.map((label) => label.name),
  }));
}

export function changeLabels(
  issueNumber: number,
  add: readonly string[],
  remove: readonly string[],
): void {
  const labelArgs = [
    ...add.flatMap((label) => ['--add-label', label]),
    ...remove.flatMap((label) => ['--remove-label', label]),
  ];
  if (labelArgs.length === 0) return;
  runGh(['issue', 'edit', String(issueNumber), ...labelArgs]);
}

export function commentOn(issueNumber: number, text: string): void {
  runGh(['issue', 'comment', String(issueNumber), '--body', text]);
}
