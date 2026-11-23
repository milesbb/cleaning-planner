import { isRecord, resourcesOfType } from './cloudformation-template';
import type { CloudFormationTemplate, Properties } from './cloudformation-template';

const SCHEDULER_SERVICE = 'scheduler.amazonaws.com';
const INVOKE_FUNCTION = 'lambda:InvokeFunction';
const NOTIFY_FUNCTION_ARNS = ['"NotifyFunction.Arn"', '["NotifyFunction","Arn"]'];
const SCHEDULER_ACTION_PREFIX = 'scheduler:';
const PASS_ROLE = 'iam:PassRole';
const PROJECT_SCHEDULE = /:schedule\/[^/]+\/\$\{AWS::StackName\}-[^/]*$/;

function listOf(value: unknown): unknown[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

// Role policies wrap statements in a PolicyDocument; SAM function policies don't.
function statementsOf(policies: unknown): Properties[] {
  return listOf(policies)
    .filter(isRecord)
    .flatMap((policy) =>
      listOf(isRecord(policy.PolicyDocument) ? policy.PolicyDocument.Statement : policy.Statement),
    )
    .filter(isRecord);
}

function actionsOf(statement: Properties): string[] {
  return listOf(statement.Action).filter((action) => typeof action === 'string');
}

function substitutionText(value: unknown): string {
  if (!isRecord(value)) return '';
  const substitution = value['Fn::Sub'];
  return typeof substitution === 'string' ? substitution : '';
}

function isNotifyFunctionArn(resource: unknown): boolean {
  return (
    isRecord(resource) && NOTIFY_FUNCTION_ARNS.includes(JSON.stringify(resource['Fn::GetAtt']))
  );
}

function schedulerRoleProblems(roleId: string, role: Properties): string[] {
  const statements = statementsOf(role.Policies);
  const managedPolicies =
    listOf(role.ManagedPolicyArns).length > 0 ? [`${roleId} has managed policies`] : [];
  const otherActions = statements
    .flatMap(actionsOf)
    .filter((action) => action !== INVOKE_FUNCTION)
    .map((action) => `${roleId} allows ${action}`);
  const canInvokeOthers = statements
    .flatMap((statement) => listOf(statement.Resource))
    .some((resource) => !isNotifyFunctionArn(resource));
  const otherTargets = canInvokeOthers
    ? [`${roleId} can invoke something other than NotifyFunction`]
    : [];
  return [...managedPolicies, ...otherActions, ...otherTargets];
}

export function schedulerRolesOnlyInvokeNotify(template: CloudFormationTemplate): string[] {
  return resourcesOfType(template, 'AWS::IAM::Role')
    .filter(([, role]) =>
      JSON.stringify(role.properties.AssumeRolePolicyDocument ?? null).includes(SCHEDULER_SERVICE),
    )
    .flatMap(([roleId, role]) => schedulerRoleProblems(roleId, role.properties));
}

function isStackRole(resource: unknown): boolean {
  return isRecord(resource) && 'Fn::GetAtt' in resource;
}

function scheduleStatementProblems(functionId: string, statement: Properties): string[] {
  const actions = actionsOf(statement);
  const resources = listOf(statement.Resource);
  const managesSchedules = actions.some((action) => action.startsWith(SCHEDULER_ACTION_PREFIX));
  const outsideProject = !resources.every((resource) =>
    PROJECT_SCHEDULE.test(substitutionText(resource)),
  );
  const passesAnyRole = actions.includes(PASS_ROLE) && !resources.every(isStackRole);
  return [
    ...(managesSchedules && outsideProject
      ? [`${functionId} can manage schedules outside the project`]
      : []),
    ...(passesAnyRole ? [`${functionId} can pass roles other than the ones this stack names`] : []),
  ];
}

export function functionsManageOnlyTheProjectsSchedules(
  template: CloudFormationTemplate,
): string[] {
  return resourcesOfType(template, 'AWS::Serverless::Function').flatMap(([functionId, resource]) =>
    statementsOf(resource.properties.Policies).flatMap((statement) =>
      scheduleStatementProblems(functionId, statement),
    ),
  );
}

// Without a log group in the template, Lambda creates one that keeps logs forever.
export function functionsLogToGroupsWithRetention(template: CloudFormationTemplate): string[] {
  const logGroupsWithRetention = new Set(
    resourcesOfType(template, 'AWS::Logs::LogGroup')
      .filter(([, logGroup]) => logGroup.properties.RetentionInDays !== undefined)
      .map(([, logGroup]) => substitutionText(logGroup.properties.LogGroupName)),
  );
  return resourcesOfType(template, 'AWS::Serverless::Function')
    .filter(([, resource]) => {
      const functionName = substitutionText(resource.properties.FunctionName);
      return functionName === '' || !logGroupsWithRetention.has(`/aws/lambda/${functionName}`);
    })
    .map(
      ([functionId]) =>
        `${functionId} has no log group in the template, so its logs are kept forever`,
    );
}
