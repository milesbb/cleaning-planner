import { describe, expect, it } from 'vitest';
import {
  apiRoutesAreThrottled,
  appClientsUseSrpOnly,
  everyApiRouteNeedsSignIn,
  functionsCannotManageSignIns,
  functionsHaveTimeouts,
  passwordsAreAtLeastTwelveCharacters,
  routesLeavePreflightsToCors,
} from './api-rules';
import { parseTemplate } from './cloudformation-template';

function templateWith(resources: string, globals = ''): ReturnType<typeof parseTemplate> {
  return parseTemplate(`${globals}Resources:\n${resources}`);
}

const SIGNED_IN_API = `  HttpApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      Auth:
        DefaultAuthorizer: CognitoAuthorizer
`;

function functionWithRoute(path: string, auth = '', method = 'ANY'): string {
  return `  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      Timeout: 10
      Events:
        Route:
          Type: HttpApi
          Properties:
            ApiId: !Ref HttpApi
            Path: ${path}
            Method: ${method}
${auth}`;
}

const PUBLIC = '            Auth:\n              Authorizer: NONE\n';

describe('everyApiRouteNeedsSignIn', () => {
  it('passes signed-in routes and a public health check', () => {
    const template = templateWith(
      SIGNED_IN_API + functionWithRoute('/v1/health', PUBLIC).replace('ApiFunction', 'Health'),
    );
    expect(everyApiRouteNeedsSignIn(template)).toEqual([]);
  });

  it('catches an API without a default authorizer', () => {
    const template = templateWith('  HttpApi:\n    Type: AWS::Serverless::HttpApi\n');
    expect(everyApiRouteNeedsSignIn(template)).toEqual(['HttpApi has no default authorizer']);
  });

  it('catches any other route that skips sign-in', () => {
    const template = templateWith(SIGNED_IN_API + functionWithRoute('/v1/households', PUBLIC));
    expect(everyApiRouteNeedsSignIn(template)).toEqual([
      'ApiFunction route /v1/households skips sign-in',
    ]);
  });
});

describe('routesLeavePreflightsToCors', () => {
  it('passes routes that name their methods', () => {
    const template = templateWith(functionWithRoute('/v1/me', '', 'PATCH'));
    expect(routesLeavePreflightsToCors(template)).toEqual([]);
  });

  it('catches an ANY route, which takes browser preflights away from CORS', () => {
    const template = templateWith(functionWithRoute('/v1/{proxy+}'));
    expect(routesLeavePreflightsToCors(template)).toEqual([
      'ApiFunction route ANY /v1/{proxy+} catches browser preflights',
    ]);
  });

  it('catches an OPTIONS route and a route with no method', () => {
    const optionsRoute = functionWithRoute('/v1/me', '', 'OPTIONS');
    const noMethod = functionWithRoute('/v1/rooms').replace('            Method: ANY\n', '');
    expect(routesLeavePreflightsToCors(templateWith(optionsRoute))).toEqual([
      'ApiFunction route OPTIONS /v1/me catches browser preflights',
    ]);
    expect(routesLeavePreflightsToCors(templateWith(noMethod))).toEqual([
      'ApiFunction route ANY /v1/rooms catches browser preflights',
    ]);
  });
});

describe('appClientsUseSrpOnly', () => {
  function client(properties: string): ReturnType<typeof parseTemplate> {
    return templateWith(
      `  Client:\n    Type: AWS::Cognito::UserPoolClient\n    Properties:\n${properties}`,
    );
  }

  it('passes a public client limited to SRP and refresh', () => {
    const template = client(
      '      GenerateSecret: false\n      ExplicitAuthFlows: [ALLOW_USER_SRP_AUTH, ALLOW_REFRESH_TOKEN_AUTH]\n',
    );
    expect(appClientsUseSrpOnly(template)).toEqual([]);
  });

  it('catches a client secret, which an app cannot keep secret', () => {
    const template = client(
      '      GenerateSecret: true\n      ExplicitAuthFlows: [ALLOW_USER_SRP_AUTH]\n',
    );
    expect(appClientsUseSrpOnly(template)).toEqual(['Client has a client secret']);
  });

  it('catches a flow that sends the plain password', () => {
    const template = client(
      '      GenerateSecret: false\n      ExplicitAuthFlows: [ALLOW_USER_SRP_AUTH, ALLOW_USER_PASSWORD_AUTH]\n',
    );
    expect(appClientsUseSrpOnly(template)).toEqual(['Client allows ALLOW_USER_PASSWORD_AUTH']);
  });

  it('catches a client that leaves its flows to the defaults', () => {
    expect(appClientsUseSrpOnly(client('      GenerateSecret: false\n'))).toEqual([
      'Client does not list its sign-in flows',
    ]);
  });
});

describe('passwordsAreAtLeastTwelveCharacters', () => {
  function userPool(minimumLength: number): ReturnType<typeof parseTemplate> {
    return templateWith(`  Users:
    Type: AWS::Cognito::UserPool
    Properties:
      Policies:
        PasswordPolicy:
          MinimumLength: ${String(minimumLength)}
`);
  }

  it('passes a 12-character minimum', () => {
    expect(passwordsAreAtLeastTwelveCharacters(userPool(12))).toEqual([]);
  });

  it('catches a shorter minimum', () => {
    expect(passwordsAreAtLeastTwelveCharacters(userPool(8))).toEqual([
      'Users allows passwords shorter than 12 characters',
    ]);
  });

  it('catches a pool with no password policy', () => {
    const template = templateWith('  Users:\n    Type: AWS::Cognito::UserPool\n');
    expect(passwordsAreAtLeastTwelveCharacters(template)).toHaveLength(1);
  });
});

describe('apiRoutesAreThrottled', () => {
  function api(routeSettings: string): ReturnType<typeof parseTemplate> {
    return templateWith(`  HttpApi:
    Type: AWS::Serverless::HttpApi
    Properties:
      DefaultRouteSettings:
        ThrottlingBurstLimit: 50
        ThrottlingRateLimit: 20
${routeSettings}`);
  }

  const TIGHT_ROUTES = `      RouteSettings:
        'GET /v1/invites/{proxy+}':
          ThrottlingBurstLimit: 10
          ThrottlingRateLimit: 2
        'POST /v1/invites/{proxy+}':
          ThrottlingBurstLimit: 10
          ThrottlingRateLimit: 2
        'GET /v1/me':
          ThrottlingBurstLimit: 10
          ThrottlingRateLimit: 5
        'PATCH /v1/me':
          ThrottlingBurstLimit: 10
          ThrottlingRateLimit: 5
        'DELETE /v1/me':
          ThrottlingBurstLimit: 5
          ThrottlingRateLimit: 1
`;

  it('passes default throttling with tighter invite and account routes', () => {
    expect(apiRoutesAreThrottled(api(TIGHT_ROUTES))).toEqual([]);
  });

  it('catches an API with no default throttling', () => {
    const template = templateWith('  HttpApi:\n    Type: AWS::Serverless::HttpApi\n');
    expect(apiRoutesAreThrottled(template)).toContain('HttpApi has no default throttling');
  });

  it('catches invite and account routes that are not tighter than the default', () => {
    expect(apiRoutesAreThrottled(api(''))).toEqual([
      'HttpApi does not throttle GET /v1/invites/{proxy+} more tightly',
      'HttpApi does not throttle POST /v1/invites/{proxy+} more tightly',
      'HttpApi does not throttle GET /v1/me more tightly',
      'HttpApi does not throttle PATCH /v1/me more tightly',
      'HttpApi does not throttle DELETE /v1/me more tightly',
    ]);
  });
});

describe('functionsHaveTimeouts', () => {
  it('passes a timeout set in Globals', () => {
    const template = templateWith(
      '  ApiFunction:\n    Type: AWS::Serverless::Function\n',
      'Globals:\n  Function:\n    Timeout: 10\n',
    );
    expect(functionsHaveTimeouts(template)).toEqual([]);
  });

  it('catches a function with no timeout', () => {
    const template = templateWith('  ApiFunction:\n    Type: AWS::Serverless::Function\n');
    expect(functionsHaveTimeouts(template)).toEqual(['ApiFunction has no timeout']);
  });

  it('catches a function allowed to run for more than 30 seconds', () => {
    const template = templateWith(
      '  ApiFunction:\n    Type: AWS::Serverless::Function\n    Properties:\n      Timeout: 60\n',
      'Globals:\n  Function:\n    Timeout: 10\n',
    );
    expect(functionsHaveTimeouts(template)).toEqual([
      'ApiFunction can run for more than 30 seconds',
    ]);
  });
});

describe('functionsCannotManageSignIns', () => {
  it('passes a function that only reaches its table', () => {
    const template = templateWith(`  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref DataTable
`);
    expect(functionsCannotManageSignIns(template)).toEqual([]);
  });

  it('catches a function allowed to call Cognito, even on one user pool', () => {
    const template = templateWith(`  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      Policies:
        - Statement:
            - Effect: Allow
              Action: cognito-idp:AdminDeleteUser
              Resource: !GetAtt UserPool.Arn
`);
    expect(functionsCannotManageSignIns(template)).toEqual([
      'ApiFunction can call Cognito with its own role',
    ]);
  });
});
