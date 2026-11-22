import { describe, expect, it } from 'vitest';
import { parseTemplate } from './cloudformation-template';

describe('parseTemplate', () => {
  it('reads short intrinsic functions as their long forms', () => {
    const template = parseTemplate(`Resources:
  Table:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub '\${AWS::StackName}-data'
      Arn: !GetAtt Table.Arn
      Joined: !Join ['-', [a, !Ref AWS::StackName]]
      Choice: !If [IsProduction, !Ref A, !Ref B]
`);
    expect(template.resources.Table?.properties).toEqual({
      TableName: { 'Fn::Sub': '${AWS::StackName}-data' },
      Arn: { 'Fn::GetAtt': 'Table.Arn' },
      Joined: { 'Fn::Join': ['-', ['a', { Ref: 'AWS::StackName' }]] },
      Choice: { 'Fn::If': ['IsProduction', { Ref: 'A' }, { Ref: 'B' }] },
    });
  });

  it('reads the parameters', () => {
    const template = parseTemplate(`Parameters:
  Stage:
    Type: String
    Default: live
Resources: {}
`);
    expect(template.parameters).toEqual({ Stage: { Type: 'String', Default: 'live' } });
  });

  it('reads the function globals', () => {
    const template = parseTemplate(`Globals:
  Function:
    Timeout: 10
Resources: {}
`);
    expect(template.functionGlobals).toEqual({ Timeout: 10 });
  });

  it('gives resources without properties an empty set', () => {
    const template = parseTemplate('Resources:\n  Thing:\n    Type: AWS::SNS::Topic\n');
    expect(template.resources.Thing).toEqual({ type: 'AWS::SNS::Topic', properties: {} });
    expect(template.functionGlobals).toEqual({});
  });

  it('rejects a file with no resources', () => {
    expect(() => parseTemplate('Description: nothing\n')).toThrow('has no Resources');
  });

  it('rejects a resource with no type', () => {
    expect(() => parseTemplate('Resources:\n  Thing:\n    Properties: {}\n')).toThrow(
      'Thing has no Type',
    );
  });
});
