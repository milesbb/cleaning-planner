import { describe, expect, it } from 'vitest';
import { parseTemplate } from './cloudformation-template';
import {
  functionsLogToGroupsWithRetention,
  functionsManageOnlyTheProjectsSchedules,
  schedulerRolesOnlyInvokeNotify,
} from './reminder-rules';

function templateWith(resources: string): ReturnType<typeof parseTemplate> {
  return parseTemplate(`Resources:\n${resources}`);
}

function schedulerRole(statements: string, extraProperties = ''): string {
  return `  SchedulerRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Statement:
          - Effect: Allow
            Principal:
              Service: scheduler.amazonaws.com
            Action: sts:AssumeRole
${extraProperties}      Policies:
        - PolicyName: invoke-notify
          PolicyDocument:
            Statement:
${statements}`;
}

const INVOKE_NOTIFY = `              - Effect: Allow
                Action: lambda:InvokeFunction
                Resource: !GetAtt NotifyFunction.Arn
`;

describe('schedulerRolesOnlyInvokeNotify', () => {
  it('passes a Scheduler role that can only invoke notify', () => {
    expect(schedulerRolesOnlyInvokeNotify(templateWith(schedulerRole(INVOKE_NOTIFY)))).toEqual([]);
  });

  it('ignores roles that Scheduler cannot assume', () => {
    const buildRole = `  BuildRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Statement:
          - Principal:
              Service: codebuild.amazonaws.com
      Policies:
        - PolicyName: build
          PolicyDocument:
            Statement:
              - Action: s3:PutObject
                Resource: '*'
`;
    expect(schedulerRolesOnlyInvokeNotify(templateWith(buildRole))).toEqual([]);
  });

  it('catches a Scheduler role allowed to do anything else', () => {
    const template = templateWith(
      schedulerRole(`${INVOKE_NOTIFY}              - Effect: Allow
                Action:
                  - lambda:InvokeFunction
                  - sqs:SendMessage
                Resource: !GetAtt NotifyFunction.Arn
`),
    );
    expect(schedulerRolesOnlyInvokeNotify(template)).toEqual([
      'SchedulerRole allows sqs:SendMessage',
    ]);
  });

  it('checks a role that Scheduler can assume alongside other services', () => {
    const template = templateWith(
      schedulerRole(INVOKE_NOTIFY.replace('lambda:InvokeFunction', 's3:GetObject')).replace(
        'Service: scheduler.amazonaws.com',
        'Service:\n                - lambda.amazonaws.com\n                - scheduler.amazonaws.com',
      ),
    );
    expect(schedulerRolesOnlyInvokeNotify(template)).toEqual(['SchedulerRole allows s3:GetObject']);
  });

  it('catches a Scheduler role that can invoke another function', () => {
    const template = templateWith(
      schedulerRole(`              - Effect: Allow
                Action: lambda:InvokeFunction
                Resource:
                  - !GetAtt NotifyFunction.Arn
                  - !GetAtt ApiFunction.Arn
`),
    );
    expect(schedulerRolesOnlyInvokeNotify(template)).toEqual([
      'SchedulerRole can invoke something other than NotifyFunction',
    ]);
  });

  it('catches a Scheduler role with a managed policy', () => {
    const template = templateWith(
      schedulerRole(
        INVOKE_NOTIFY,
        '      ManagedPolicyArns:\n        - arn:aws:iam::aws:policy/AWSLambdaRole\n',
      ),
    );
    expect(schedulerRolesOnlyInvokeNotify(template)).toEqual([
      'SchedulerRole has managed policies',
    ]);
  });
});

function functionWithStatements(statements: string): string {
  return `  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref DataTable
        - Statement:
${statements}`;
}

const PROJECT_SCHEDULES = `            - Effect: Allow
              Action:
                - scheduler:CreateSchedule
                - scheduler:DeleteSchedule
              Resource: !Sub 'arn:\${AWS::Partition}:scheduler:\${AWS::Region}:\${AWS::AccountId}:schedule/\${ReminderScheduleGroup}/\${AWS::StackName}-*'
            - Effect: Allow
              Action: iam:PassRole
              Resource: !GetAtt ReminderSchedulerRole.Arn
`;

describe('functionsManageOnlyTheProjectsSchedules', () => {
  it("passes a function limited to the project's schedules and the Scheduler role", () => {
    const template = templateWith(functionWithStatements(PROJECT_SCHEDULES));
    expect(functionsManageOnlyTheProjectsSchedules(template)).toEqual([]);
  });

  it('catches a function that can manage every schedule', () => {
    const template = templateWith(
      functionWithStatements(`            - Effect: Allow
              Action: scheduler:*
              Resource: '*'
`),
    );
    expect(functionsManageOnlyTheProjectsSchedules(template)).toEqual([
      'ApiFunction can manage schedules outside the project',
    ]);
  });

  it("catches schedule names that don't start with the stack name", () => {
    const template = templateWith(
      functionWithStatements(`            - Effect: Allow
              Action: scheduler:CreateSchedule
              Resource: !Sub 'arn:\${AWS::Partition}:scheduler:\${AWS::Region}:\${AWS::AccountId}:schedule/default/*'
`),
    );
    expect(functionsManageOnlyTheProjectsSchedules(template)).toEqual([
      'ApiFunction can manage schedules outside the project',
    ]);
  });

  it('catches a function that can pass any role', () => {
    const template = templateWith(
      functionWithStatements(`            - Effect: Allow
              Action: iam:PassRole
              Resource: '*'
`),
    );
    expect(functionsManageOnlyTheProjectsSchedules(template)).toEqual([
      'ApiFunction can pass roles other than the ones this stack names',
    ]);
  });
});

function namedFunction(logicalId: string, name: string): string {
  return `  ${logicalId}:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub '\${AWS::StackName}-${name}'
`;
}

function logGroupFor(logicalId: string, name: string): string {
  return `  ${logicalId}:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub '/aws/lambda/\${AWS::StackName}-${name}'
      RetentionInDays: 30
`;
}

describe('functionsLogToGroupsWithRetention', () => {
  it('passes functions whose log groups the template creates', () => {
    const template = templateWith(
      namedFunction('ApiFunction', 'api') +
        logGroupFor('ApiLogGroup', 'api') +
        namedFunction('NotifyFunction', 'notify') +
        logGroupFor('NotifyLogGroup', 'notify'),
    );
    expect(functionsLogToGroupsWithRetention(template)).toEqual([]);
  });

  it('catches a function whose log group Lambda would create, kept forever', () => {
    const template = templateWith(
      namedFunction('ApiFunction', 'api') +
        logGroupFor('ApiLogGroup', 'api') +
        namedFunction('NotifyFunction', 'notify'),
    );
    expect(functionsLogToGroupsWithRetention(template)).toEqual([
      'NotifyFunction has no log group in the template, so its logs are kept forever',
    ]);
  });

  it('catches a function without a name, whose log group cannot be declared', () => {
    const template = templateWith(
      '  NotifyFunction:\n    Type: AWS::Serverless::Function\n    Properties:\n      Handler: notify.handler\n',
    );
    expect(functionsLogToGroupsWithRetention(template)).toEqual([
      'NotifyFunction has no log group in the template, so its logs are kept forever',
    ]);
  });
});
