import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTemplate } from './cloudformation-template';
import { pipelineDeploysEveryApiWorkspace } from './pipeline-rules';
import { INFRASTRUCTURE_RULES } from './rules';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '../../..');
const TEMPLATE_PATH = resolve(REPOSITORY_ROOT, 'infrastructure/template.yml');
const WORKSPACE_PREFIX = '@cleaning-planner/';

function workspaceDependenciesOf(workspace: string): string[] {
  const manifest: unknown = JSON.parse(
    readFileSync(resolve(REPOSITORY_ROOT, workspace, 'package.json'), 'utf8'),
  );
  if (typeof manifest !== 'object' || manifest === null) return [];
  const dependencies = 'dependencies' in manifest ? manifest.dependencies : {};
  return Object.keys(typeof dependencies === 'object' && dependencies !== null ? dependencies : {})
    .filter((name) => name.startsWith(WORKSPACE_PREFIX))
    .map((name) => `packages/${name.slice(WORKSPACE_PREFIX.length)}`);
}

// apps/api and every workspace package it depends on, directly or through another.
function apiWorkspaces(): string[] {
  const found = new Set(['apps/api']);
  for (const workspace of found) {
    for (const dependency of workspaceDependenciesOf(workspace)) found.add(dependency);
  }
  return [...found];
}

describe('infrastructure/template.yml', () => {
  const template = parseTemplate(readFileSync(TEMPLATE_PATH, 'utf8'));

  it.each(Object.entries(INFRASTRUCTURE_RULES))('follows the rule: %s', (_, rule) => {
    expect(rule(template)).toEqual([]);
  });

  it('redeploys the API when it or any workspace it bundles changes', () => {
    expect(apiWorkspaces()).toEqual(
      expect.arrayContaining(['apps/api', 'packages/contracts', 'packages/schedule']),
    );
    expect(pipelineDeploysEveryApiWorkspace(template, apiWorkspaces())).toEqual([]);
  });

  it('has what reminders need: notify, a schedule group and a role Scheduler can assume', () => {
    const resourceTypes = Object.fromEntries(
      Object.entries(template.resources).map(([logicalId, resource]) => [logicalId, resource.type]),
    );
    expect(resourceTypes).toMatchObject({
      NotifyFunction: 'AWS::Serverless::Function',
      ReminderScheduleGroup: 'AWS::Scheduler::ScheduleGroup',
      ReminderSchedulerRole: 'AWS::IAM::Role',
    });
  });
});
