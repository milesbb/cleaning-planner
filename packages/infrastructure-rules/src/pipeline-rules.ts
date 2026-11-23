import { isRecord, recordAt, resourcesOfType } from './cloudformation-template';
import type { CloudFormationTemplate, Properties } from './cloudformation-template';

function asRecords(value: unknown): Properties[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function triggerPathsOf(pipeline: Properties): string[] {
  return asRecords(pipeline.Triggers)
    .flatMap((trigger) => asRecords(recordAt(trigger, 'GitConfiguration').Push))
    .flatMap((push) => {
      const includes: unknown = recordAt(push, 'FilePaths').Includes;
      return Array.isArray(includes) ? includes.map(String) : [];
    });
}

// The pipeline only runs for the paths in its trigger, so every workspace bundled
// into the API (apps/api and the packages it imports, directly or not) must be one
// of them, or a change there never reaches the live API.
export function pipelineDeploysEveryApiWorkspace(
  template: CloudFormationTemplate,
  apiWorkspaces: readonly string[],
): string[] {
  const pipelines = resourcesOfType(template, 'AWS::CodePipeline::Pipeline').map(
    ([logicalId, resource]) => [logicalId, triggerPathsOf(resource.properties)] as const,
  );
  const [pipeline] = pipelines.filter(([, paths]) => paths.includes('apps/api/**'));
  if (pipeline === undefined) return ['No pipeline is started by pushes to the API'];
  const [logicalId, paths] = pipeline;
  return apiWorkspaces
    .filter((workspace) => !paths.includes(`${workspace}/**`))
    .map(
      (workspace) =>
        `${logicalId}: a change to ${workspace} (bundled into the API) does not start the pipeline`,
    );
}
