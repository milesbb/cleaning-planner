import { DEFAULT_SCHEMA, Type, load } from 'js-yaml';

export type Properties = Record<string, unknown>;

export interface TemplateResource {
  type: string;
  properties: Properties;
}

export interface CloudFormationTemplate {
  functionGlobals: Properties;
  resources: Record<string, TemplateResource>;
}

const INTRINSIC_FUNCTIONS = [
  'Ref',
  'Condition',
  'Sub',
  'GetAtt',
  'Join',
  'Select',
  'Split',
  'If',
  'Equals',
  'Not',
  'And',
  'Or',
  'FindInMap',
  'ImportValue',
  'Base64',
  'Cidr',
  'GetAZs',
  'Transform',
] as const;

const YAML_NODE_KINDS = ['scalar', 'sequence', 'mapping'] as const;

function longFormOf(functionName: string): string {
  return functionName === 'Ref' || functionName === 'Condition'
    ? functionName
    : `Fn::${functionName}`;
}

const CLOUDFORMATION_SCHEMA = DEFAULT_SCHEMA.extend(
  INTRINSIC_FUNCTIONS.flatMap((functionName) =>
    YAML_NODE_KINDS.map(
      (kind) =>
        new Type(`!${functionName}`, {
          kind,
          construct: (data: unknown): Properties => ({ [longFormOf(functionName)]: data }),
        }),
    ),
  ),
);

export function isRecord(value: unknown): value is Properties {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readResource(logicalId: string, resource: unknown): TemplateResource {
  if (!isRecord(resource) || typeof resource.Type !== 'string') {
    throw new Error(`${logicalId} has no Type`);
  }
  return {
    type: resource.Type,
    properties: isRecord(resource.Properties) ? resource.Properties : {},
  };
}

function readFunctionGlobals(globals: unknown): Properties {
  return isRecord(globals) && isRecord(globals.Function) ? globals.Function : {};
}

export function parseTemplate(text: string): CloudFormationTemplate {
  const document = load(text, { schema: CLOUDFORMATION_SCHEMA });
  if (!isRecord(document) || !isRecord(document.Resources)) {
    throw new Error('The template has no Resources');
  }
  const resources = Object.entries(document.Resources).map(
    ([logicalId, resource]) => [logicalId, readResource(logicalId, resource)] as const,
  );
  return {
    functionGlobals: readFunctionGlobals(document.Globals),
    resources: Object.fromEntries(resources),
  };
}
