import { CORE_SCHEMA, defineMappingTag, defineScalarTag, defineSequenceTag, load } from 'js-yaml';
import type { TagDefinition } from 'js-yaml';

export type Properties = Record<string, unknown>;

export interface TemplateResource {
  type: string;
  properties: Properties;
}

export interface CloudFormationTemplate {
  parameters: Record<string, Properties>;
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

function longFormOf(functionName: string): string {
  return functionName === 'Ref' || functionName === 'Condition'
    ? functionName
    : `Fn::${functionName}`;
}

// Load-only: the rules never write YAML, so no value is ever dumped with these tags.
const NEVER_DUMPED = (): boolean => false;

// `!Sub x`, `!Join [..]` and `!Transform {..}` each become `{ "Fn::Name": value }`.
function intrinsicFunctionTags(functionName: string): TagDefinition[] {
  const tagName = `!${functionName}`;
  const wrap = (value: unknown): Properties => ({ [longFormOf(functionName)]: value });
  return [
    defineScalarTag(tagName, { resolve: wrap, identify: NEVER_DUMPED }),
    defineSequenceTag<unknown[], Properties>(tagName, {
      create: () => [],
      addItem: (items, item) => {
        items.push(item);
      },
      finalize: wrap,
      identify: NEVER_DUMPED,
    }),
    defineMappingTag<Properties, Properties>(tagName, {
      create: () => ({}),
      addPair: (mapping, key, value) => {
        mapping[String(key)] = value;
        return '';
      },
      has: (mapping, key) => Object.hasOwn(mapping, String(key)),
      keys: (result) => Object.keys(result),
      get: (result, key) => result[String(key)],
      finalize: wrap,
      identify: NEVER_DUMPED,
    }),
  ];
}

const CLOUDFORMATION_SCHEMA = CORE_SCHEMA.withTags(
  INTRINSIC_FUNCTIONS.flatMap(intrinsicFunctionTags),
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

function readParameters(parameters: unknown): Record<string, Properties> {
  if (!isRecord(parameters)) return {};
  return Object.fromEntries(
    Object.entries(parameters).map(([name, parameter]) => [
      name,
      isRecord(parameter) ? parameter : {},
    ]),
  );
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
    parameters: readParameters(document.Parameters),
    functionGlobals: readFunctionGlobals(document.Globals),
    resources: Object.fromEntries(resources),
  };
}

export function resourcesOfType(
  template: CloudFormationTemplate,
  resourceType: string,
): [string, TemplateResource][] {
  return Object.entries(template.resources).filter(
    ([, resource]) => resource.type === resourceType,
  );
}

export function recordAt(properties: Properties, ...path: string[]): Properties {
  let current: unknown = properties;
  for (const key of path) current = isRecord(current) ? current[key] : undefined;
  return isRecord(current) ? current : {};
}
