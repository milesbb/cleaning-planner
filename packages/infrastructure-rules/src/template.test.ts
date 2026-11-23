import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTemplate } from './cloudformation-template';
import { INFRASTRUCTURE_RULES } from './rules';

const TEMPLATE_PATH = resolve(import.meta.dirname, '../../../infrastructure/template.yml');

describe('infrastructure/template.yml', () => {
  const template = parseTemplate(readFileSync(TEMPLATE_PATH, 'utf8'));

  it.each(Object.entries(INFRASTRUCTURE_RULES))('follows the rule: %s', (_, rule) => {
    expect(rule(template)).toEqual([]);
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
