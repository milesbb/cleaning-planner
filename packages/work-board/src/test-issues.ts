import type { Issue } from './issues.ts';

interface IssueDetails {
  labels?: readonly string[];
  dependsOn?: string;
  title?: string;
}

export function issue(number: number, details: IssueDetails = {}): Issue {
  return {
    number,
    title: details.title ?? `Issue ${String(number)}`,
    labels: details.labels ?? [],
    body: `## What\n\nSomething.\n\n**Depends on:** ${details.dependsOn ?? 'nothing'}\n`,
  };
}
