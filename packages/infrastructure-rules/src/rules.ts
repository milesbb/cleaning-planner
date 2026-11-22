import { isRecord } from './cloudformation-template';
import type {
  CloudFormationTemplate,
  Properties,
  TemplateResource,
} from './cloudformation-template';

type Rule = (template: CloudFormationTemplate) => string[];

const BOUNDARY_NAME = 'workload-permissions-boundary';
const STACK_NAME = '${AWS::StackName}';
const ROLE_TYPE = 'AWS::IAM::Role';
const SERVERLESS_FUNCTION_TYPE = 'AWS::Serverless::Function';
const FUNCTION_TYPES = [SERVERLESS_FUNCTION_TYPE, 'AWS::Lambda::Function'];
const FULL_ACCESS_POLICY = /[A-Za-z0-9]*FullAccess/;
const APP_ORIGINS = ['https://localhost'];
const HTTP_ORIGIN = /^https?:\/\/[^/\s]+$/;
const TIME_TO_LIVE_ATTRIBUTE = 'expiresAt';
const HOURLY_RESOURCE_TYPES = [/^AWS::EC2::(VPC|NatGateway|Subnet)$/, /^AWS::RDS::/];

function resourceEntries(template: CloudFormationTemplate): [string, TemplateResource][] {
  return Object.entries(template.resources);
}

function mentions(value: unknown, text: string): boolean {
  return JSON.stringify(value ?? null).includes(text);
}

function lacksBoundary(resource: TemplateResource, globalsHaveBoundary: boolean): boolean {
  if (mentions(resource.properties.PermissionsBoundary, BOUNDARY_NAME)) return false;
  if (resource.type === ROLE_TYPE) return true;
  return resource.type === SERVERLESS_FUNCTION_TYPE && !globalsHaveBoundary;
}

export function everyRoleHasThePermissionsBoundary(template: CloudFormationTemplate): string[] {
  const globalsHaveBoundary = mentions(template.functionGlobals.PermissionsBoundary, BOUNDARY_NAME);
  return resourceEntries(template)
    .filter(([, resource]) => lacksBoundary(resource, globalsHaveBoundary))
    .map(([logicalId, resource]) => `${logicalId} (${resource.type}) has no ${BOUNDARY_NAME}`);
}

export function everyLogGroupHasRetention(template: CloudFormationTemplate): string[] {
  return resourceEntries(template)
    .filter(([, resource]) => resource.type === 'AWS::Logs::LogGroup')
    .filter(([, resource]) => resource.properties.RetentionInDays === undefined)
    .map(([logicalId]) => `${logicalId} has no RetentionInDays`);
}

function nameFields(properties: Properties): [string, unknown][] {
  const topLevelNames = Object.entries(properties).filter(([key]) => key.endsWith('Name'));
  const budgetNames = isRecord(properties.Budget)
    ? Object.entries(properties.Budget).filter(([key]) => key === 'BudgetName')
    : [];
  return [...topLevelNames, ...budgetNames];
}

function startsWithStackName(name: unknown): boolean {
  if (!isRecord(name)) return false;
  if (name.Ref === 'AWS::StackName') return true;
  const substitution = name['Fn::Sub'];
  if (typeof substitution !== 'string') return false;
  const lastPathSegment = substitution.split('/').at(-1) ?? '';
  return lastPathSegment.startsWith(STACK_NAME);
}

export function everyNameStartsWithTheStackName(template: CloudFormationTemplate): string[] {
  return resourceEntries(template).flatMap(([logicalId, resource]) =>
    nameFields(resource.properties)
      .filter(([, name]) => !startsWithStackName(name))
      .map(([field]) => `${logicalId}'s ${field} does not start with the stack name`),
  );
}

function fullAccessPoliciesIn(properties: Properties): string[] {
  const attachedPolicies = [properties.ManagedPolicyArns, properties.Policies].flatMap(
    (policies): unknown[] =>
      Array.isArray(policies) ? policies.map((policy: unknown) => policy) : [],
  );
  return attachedPolicies.flatMap((policy) => {
    const match = FULL_ACCESS_POLICY.exec(JSON.stringify(policy));
    return match === null ? [] : [match[0]];
  });
}

export function noFullAccessPolicies(template: CloudFormationTemplate): string[] {
  return resourceEntries(template).flatMap(([logicalId, resource]) =>
    fullAccessPoliciesIn(resource.properties).map((policy) => `${logicalId} uses ${policy}`),
  );
}

function hourlyResourceProblem(logicalId: string, resource: TemplateResource): string[] {
  if (HOURLY_RESOURCE_TYPES.some((pattern) => pattern.test(resource.type))) {
    return [`${logicalId} is a ${resource.type}`];
  }
  const isFunctionInVpc =
    FUNCTION_TYPES.includes(resource.type) && resource.properties.VpcConfig !== undefined;
  return isFunctionInVpc ? [`${logicalId} runs inside a VPC`] : [];
}

export function noHourlyNetworkOrDatabaseResources(template: CloudFormationTemplate): string[] {
  const globalsProblems =
    template.functionGlobals.VpcConfig === undefined ? [] : ['Globals put functions in a VPC'];
  const resourceProblems = resourceEntries(template).flatMap(([logicalId, resource]) =>
    hourlyResourceProblem(logicalId, resource),
  );
  return [...globalsProblems, ...resourceProblems];
}

export function apiAllowsTheAppOrigins(template: CloudFormationTemplate): string[] {
  const allowedOrigins = template.parameters.AllowedOrigins?.Default;
  const origins = typeof allowedOrigins === 'string' ? allowedOrigins.split(',') : [];
  const missing = APP_ORIGINS.filter((origin) => !origins.includes(origin)).map(
    (origin) => `AllowedOrigins does not include ${origin}`,
  );
  const rejected = origins
    .filter((origin) => !HTTP_ORIGIN.test(origin))
    .map((origin) => `${origin} is not an http(s) origin, which API Gateway rejects`);
  return [...missing, ...rejected];
}

function expiresItems(properties: Properties): boolean {
  const timeToLive = properties.TimeToLiveSpecification;
  return (
    isRecord(timeToLive) &&
    timeToLive.AttributeName === TIME_TO_LIVE_ATTRIBUTE &&
    timeToLive.Enabled === true
  );
}

export function dataTablesExpireItems(template: CloudFormationTemplate): string[] {
  return resourceEntries(template)
    .filter(([, resource]) => resource.type === 'AWS::DynamoDB::Table')
    .filter(([, table]) => !expiresItems(table.properties))
    .map(([logicalId]) => `${logicalId} does not expire items by ${TIME_TO_LIVE_ATTRIBUTE}`);
}

export const INFRASTRUCTURE_RULES: Record<string, Rule> = {
  'every IAM role and function has the permissions boundary': everyRoleHasThePermissionsBoundary,
  'every log group sets RetentionInDays': everyLogGroupHasRetention,
  'every named resource starts with the stack name': everyNameStartsWithTheStackName,
  'no FullAccess managed policies': noFullAccessPolicies,
  'no VPC, NAT Gateway or RDS': noHourlyNetworkOrDatabaseResources,
  'the API allows the Android app origin, and only http(s) origins': apiAllowsTheAppOrigins,
  'data tables remove expired items': dataTablesExpireItems,
};
