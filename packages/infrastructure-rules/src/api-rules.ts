import { isRecord } from './cloudformation-template';
import type {
  CloudFormationTemplate,
  Properties,
  TemplateResource,
} from './cloudformation-template';

const PUBLIC_ROUTES = ['/v1/health'];
const SAFE_SIGN_IN_FLOWS = ['ALLOW_USER_SRP_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH'];
const MINIMUM_PASSWORD_LENGTH = 12;
const TIGHTLY_THROTTLED_ROUTES = ['ANY /v1/invites/{proxy+}', 'ANY /v1/me'];
const MAXIMUM_TIMEOUT_SECONDS = 30;

function resourcesOfType(
  template: CloudFormationTemplate,
  resourceType: string,
): [string, TemplateResource][] {
  return Object.entries(template.resources).filter(
    ([, resource]) => resource.type === resourceType,
  );
}

function recordAt(properties: Properties, ...path: string[]): Properties {
  let current: unknown = properties;
  for (const key of path) current = isRecord(current) ? current[key] : undefined;
  return isRecord(current) ? current : {};
}

function publicRouteProblems(functionId: string, resource: TemplateResource): string[] {
  return Object.values(recordAt(resource.properties, 'Events'))
    .filter((event) => isRecord(event) && event.Type === 'HttpApi')
    .map((event) => recordAt({ event }, 'event', 'Properties'))
    .filter((route) => recordAt(route, 'Auth').Authorizer === 'NONE')
    .map((route) => String(route.Path))
    .filter((path) => !PUBLIC_ROUTES.includes(path))
    .map((path) => `${functionId} route ${path} skips sign-in`);
}

export function everyApiRouteNeedsSignIn(template: CloudFormationTemplate): string[] {
  const apisWithoutSignIn = resourcesOfType(template, 'AWS::Serverless::HttpApi')
    .filter(([, api]) => typeof recordAt(api.properties, 'Auth').DefaultAuthorizer !== 'string')
    .map(([apiId]) => `${apiId} has no default authorizer`);
  const publicRoutes = resourcesOfType(template, 'AWS::Serverless::Function').flatMap(
    ([functionId, resource]) => publicRouteProblems(functionId, resource),
  );
  return [...apisWithoutSignIn, ...publicRoutes];
}

function clientProblems(clientId: string, client: Properties): string[] {
  const secretProblems = client.GenerateSecret === false ? [] : [`${clientId} has a client secret`];
  const flows = client.ExplicitAuthFlows;
  if (!Array.isArray(flows)) {
    return [...secretProblems, `${clientId} does not list its sign-in flows`];
  }
  const unsafeFlows = flows
    .map((flow: unknown) => String(flow))
    .filter((flow) => !SAFE_SIGN_IN_FLOWS.includes(flow))
    .map((flow) => `${clientId} allows ${flow}`);
  return [...secretProblems, ...unsafeFlows];
}

export function appClientsUseSrpOnly(template: CloudFormationTemplate): string[] {
  return resourcesOfType(template, 'AWS::Cognito::UserPoolClient').flatMap(([clientId, client]) =>
    clientProblems(clientId, client.properties),
  );
}

export function passwordsAreAtLeastTwelveCharacters(template: CloudFormationTemplate): string[] {
  return resourcesOfType(template, 'AWS::Cognito::UserPool')
    .filter(([, pool]) => {
      const minimumLength = recordAt(pool.properties, 'Policies', 'PasswordPolicy').MinimumLength;
      return typeof minimumLength !== 'number' || minimumLength < MINIMUM_PASSWORD_LENGTH;
    })
    .map(
      ([poolId]) =>
        `${poolId} allows passwords shorter than ${String(MINIMUM_PASSWORD_LENGTH)} characters`,
    );
}

function rateLimitOf(settings: Properties): number {
  return typeof settings.ThrottlingRateLimit === 'number' ? settings.ThrottlingRateLimit : Infinity;
}

function throttlingProblems(apiId: string, api: Properties): string[] {
  const defaultRate = rateLimitOf(recordAt(api, 'DefaultRouteSettings'));
  const defaultProblems = defaultRate === Infinity ? [`${apiId} has no default throttling`] : [];
  const looseRoutes = TIGHTLY_THROTTLED_ROUTES.filter(
    (route) => rateLimitOf(recordAt(api, 'RouteSettings', route)) >= defaultRate,
  ).map((route) => `${apiId} does not throttle ${route} more tightly`);
  return [...defaultProblems, ...looseRoutes];
}

export function apiRoutesAreThrottled(template: CloudFormationTemplate): string[] {
  return resourcesOfType(template, 'AWS::Serverless::HttpApi').flatMap(([apiId, api]) =>
    throttlingProblems(apiId, api.properties),
  );
}

export function functionsHaveTimeouts(template: CloudFormationTemplate): string[] {
  return resourcesOfType(template, 'AWS::Serverless::Function').flatMap(
    ([functionId, resource]) => {
      const timeout = resource.properties.Timeout ?? template.functionGlobals.Timeout;
      if (typeof timeout !== 'number') return [`${functionId} has no timeout`];
      return timeout > MAXIMUM_TIMEOUT_SECONDS
        ? [`${functionId} can run for more than ${String(MAXIMUM_TIMEOUT_SECONDS)} seconds`]
        : [];
    },
  );
}

export function functionsCannotManageSignIns(template: CloudFormationTemplate): string[] {
  return resourcesOfType(template, 'AWS::Serverless::Function')
    .filter(([, resource]) =>
      JSON.stringify(resource.properties.Policies ?? []).includes('cognito-idp'),
    )
    .map(([functionId]) => `${functionId} can call Cognito with its own role`);
}
