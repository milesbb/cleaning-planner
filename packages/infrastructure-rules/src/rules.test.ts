import { describe, expect, it } from 'vitest';
import { parseTemplate } from './cloudformation-template';
import type { CloudFormationTemplate } from './cloudformation-template';
import {
  apiAllowsTheAppOrigins,
  dataTablesExpireItems,
  everyLogGroupHasRetention,
  everyNameStartsWithTheStackName,
  everyRoleHasThePermissionsBoundary,
  noFullAccessPolicies,
  noHourlyNetworkOrDatabaseResources,
} from './rules';

const BOUNDARY =
  "!Sub 'arn:${AWS::Partition}:iam::${AWS::AccountId}:policy/workload-permissions-boundary'";

function templateWith(resources: string, globals = ''): string {
  return `AWSTemplateFormatVersion: '2010-09-09'\n${globals}Resources:\n${resources}`;
}

describe('everyRoleHasThePermissionsBoundary', () => {
  it('passes roles and functions that carry the boundary', () => {
    const template = parseTemplate(
      templateWith(
        `  BuildRole:
    Type: AWS::IAM::Role
    Properties:
      PermissionsBoundary: ${BOUNDARY}
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: lambda.handler
`,
        `Globals:\n  Function:\n    PermissionsBoundary: ${BOUNDARY}\n`,
      ),
    );
    expect(everyRoleHasThePermissionsBoundary(template)).toEqual([]);
  });

  it('catches a role without the boundary', () => {
    const template = parseTemplate(
      templateWith(`  BuildRole:\n    Type: AWS::IAM::Role\n    Properties:\n      Path: /\n`),
    );
    expect(everyRoleHasThePermissionsBoundary(template)).toEqual([
      'BuildRole (AWS::IAM::Role) has no workload-permissions-boundary',
    ]);
  });

  it('catches a function when neither it nor Globals set the boundary', () => {
    const template = parseTemplate(
      templateWith(
        `  ApiFunction:\n    Type: AWS::Serverless::Function\n    Properties:\n      Handler: lambda.handler\n`,
      ),
    );
    expect(everyRoleHasThePermissionsBoundary(template)).toEqual([
      'ApiFunction (AWS::Serverless::Function) has no workload-permissions-boundary',
    ]);
  });

  it('catches a different boundary', () => {
    const template = parseTemplate(
      templateWith(
        `  BuildRole:\n    Type: AWS::IAM::Role\n    Properties:\n      PermissionsBoundary: arn:aws:iam::aws:policy/PowerUserAccess\n`,
      ),
    );
    expect(everyRoleHasThePermissionsBoundary(template)).toHaveLength(1);
  });
});

describe('everyLogGroupHasRetention', () => {
  it('passes a log group with a retention period', () => {
    const template = parseTemplate(
      templateWith(
        `  Logs:\n    Type: AWS::Logs::LogGroup\n    Properties:\n      RetentionInDays: 30\n`,
      ),
    );
    expect(everyLogGroupHasRetention(template)).toEqual([]);
  });

  it('catches a log group kept forever', () => {
    const template = parseTemplate(
      templateWith(
        `  Logs:\n    Type: AWS::Logs::LogGroup\n    Properties:\n      LogGroupName: logs\n`,
      ),
    );
    expect(everyLogGroupHasRetention(template)).toEqual(['Logs has no RetentionInDays']);
  });
});

describe('everyNameStartsWithTheStackName', () => {
  it('passes names built from the stack name, including log group paths', () => {
    const template = parseTemplate(
      templateWith(`  Table:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub '\${AWS::StackName}-data'
  Logs:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub '/aws/lambda/\${AWS::StackName}-api'
  Pipeline:
    Type: AWS::CodePipeline::Pipeline
    Properties:
      Name: !Ref AWS::StackName
  Budget:
    Type: AWS::Budgets::Budget
    Properties:
      Budget:
        BudgetName: !Sub '\${AWS::StackName}-monthly-cost'
`),
    );
    expect(everyNameStartsWithTheStackName(template)).toEqual([]);
  });

  it('catches a fixed name', () => {
    const template = parseTemplate(
      templateWith(
        `  Table:\n    Type: AWS::DynamoDB::Table\n    Properties:\n      TableName: my-table\n`,
      ),
    );
    expect(everyNameStartsWithTheStackName(template)).toEqual([
      "Table's TableName does not start with the stack name",
    ]);
  });

  it('catches a name that only mentions the stack name later on', () => {
    const template = parseTemplate(
      templateWith(
        `  Budget:\n    Type: AWS::Budgets::Budget\n    Properties:\n      Budget:\n        BudgetName: !Sub 'cost-\${AWS::StackName}'\n`,
      ),
    );
    expect(everyNameStartsWithTheStackName(template)).toEqual([
      "Budget's BudgetName does not start with the stack name",
    ]);
  });
});

describe('noFullAccessPolicies', () => {
  it('passes scoped SAM policy templates', () => {
    const template = parseTemplate(
      templateWith(`  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref Table
`),
    );
    expect(noFullAccessPolicies(template)).toEqual([]);
  });

  it('catches a FullAccess managed policy on a role', () => {
    const template = parseTemplate(
      templateWith(`  BuildRole:
    Type: AWS::IAM::Role
    Properties:
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AmazonS3FullAccess
`),
    );
    expect(noFullAccessPolicies(template)).toEqual(['BuildRole uses AmazonS3FullAccess']);
  });

  it('catches a FullAccess policy named in a function', () => {
    const template = parseTemplate(
      templateWith(`  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      Policies:
        - AmazonDynamoDBFullAccess
`),
    );
    expect(noFullAccessPolicies(template)).toEqual(['ApiFunction uses AmazonDynamoDBFullAccess']);
  });
});

describe('noHourlyNetworkOrDatabaseResources', () => {
  it('passes serverless resources', () => {
    const template = parseTemplate(
      templateWith(
        `  Table:\n    Type: AWS::DynamoDB::Table\n    Properties:\n      BillingMode: PAY_PER_REQUEST\n`,
      ),
    );
    expect(noHourlyNetworkOrDatabaseResources(template)).toEqual([]);
  });

  it.each(['AWS::EC2::VPC', 'AWS::EC2::NatGateway', 'AWS::EC2::Subnet', 'AWS::RDS::DBInstance'])(
    'catches %s',
    (resourceType) => {
      const template = parseTemplate(templateWith(`  Thing:\n    Type: ${resourceType}\n`));
      expect(noHourlyNetworkOrDatabaseResources(template)).toEqual([`Thing is a ${resourceType}`]);
    },
  );

  it('catches a function placed in a VPC', () => {
    const template = parseTemplate(
      templateWith(`  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      VpcConfig:
        SubnetIds: [subnet-1]
`),
    );
    expect(noHourlyNetworkOrDatabaseResources(template)).toEqual(['ApiFunction runs inside a VPC']);
  });

  it('catches functions placed in a VPC through Globals', () => {
    const template = parseTemplate(
      templateWith(
        `  ApiFunction:\n    Type: AWS::Serverless::Function\n`,
        `Globals:\n  Function:\n    VpcConfig:\n      SubnetIds: [subnet-1]\n`,
      ),
    );
    expect(noHourlyNetworkOrDatabaseResources(template)).toEqual([
      'Globals put functions in a VPC',
    ]);
  });
});

describe('apiAllowsTheAppOrigins', () => {
  function templateWithOrigins(origins: string): CloudFormationTemplate {
    return parseTemplate(
      `Parameters:\n  AllowedOrigins:\n    Type: CommaDelimitedList\n    Default: ${origins}\nResources: {}\n`,
    );
  }

  it('passes when the Android app origin is allowed', () => {
    const template = templateWithOrigins(
      'https://example.com,http://localhost:3000,https://localhost',
    );
    expect(apiAllowsTheAppOrigins(template)).toEqual([]);
  });

  it('names the app origin when it is missing', () => {
    expect(apiAllowsTheAppOrigins(templateWithOrigins('https://example.com'))).toEqual([
      'AllowedOrigins does not include https://localhost',
    ]);
  });

  it('catches an origin API Gateway would reject, such as the iOS app scheme', () => {
    expect(
      apiAllowsTheAppOrigins(templateWithOrigins('https://localhost,capacitor://localhost')),
    ).toEqual(['capacitor://localhost is not an http(s) origin, which API Gateway rejects']);
  });

  it('catches a template with no AllowedOrigins parameter', () => {
    expect(apiAllowsTheAppOrigins(parseTemplate('Resources: {}\n'))).toHaveLength(1);
  });
});

describe('dataTablesExpireItems', () => {
  it('passes a table that removes items once expiresAt has passed', () => {
    const template = parseTemplate(
      templateWith(`  Table:
    Type: AWS::DynamoDB::Table
    Properties:
      TimeToLiveSpecification:
        AttributeName: expiresAt
        Enabled: true
`),
    );
    expect(dataTablesExpireItems(template)).toEqual([]);
  });

  it('catches a table that keeps expired invites forever', () => {
    const template = parseTemplate(
      templateWith(
        `  Table:\n    Type: AWS::DynamoDB::Table\n    Properties:\n      BillingMode: PAY_PER_REQUEST\n`,
      ),
    );
    expect(dataTablesExpireItems(template)).toEqual(['Table does not expire items by expiresAt']);
  });

  it('catches TTL on the wrong attribute or switched off', () => {
    const template = parseTemplate(
      templateWith(`  Table:
    Type: AWS::DynamoDB::Table
    Properties:
      TimeToLiveSpecification:
        AttributeName: ttl
        Enabled: false
`),
    );
    expect(dataTablesExpireItems(template)).toHaveLength(1);
  });
});
