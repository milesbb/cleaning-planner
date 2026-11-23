import { describe, expect, it } from 'vitest';
import { parseTemplate } from './cloudformation-template';
import { pipelineDeploysEveryApiWorkspace } from './pipeline-rules';

function pipelineTriggeredBy(paths: readonly string[]): ReturnType<typeof parseTemplate> {
  const includes = paths.map((path) => `                    - ${path}`).join('\n');
  return parseTemplate(`Resources:
  Pipeline:
    Type: AWS::CodePipeline::Pipeline
    Properties:
      Triggers:
        - ProviderType: CodeStarSourceConnection
          GitConfiguration:
            SourceActionName: GitHub
            Push:
              - Branches:
                  Includes:
                    - production
                FilePaths:
                  Includes:
${includes}
`);
}

const API_WORKSPACES = ['apps/api', 'packages/contracts', 'packages/schedule'];

describe('pipelineDeploysEveryApiWorkspace', () => {
  it('passes when a change to the API or any workspace it bundles starts the pipeline', () => {
    const template = pipelineTriggeredBy([
      'apps/api/**',
      'packages/contracts/**',
      'packages/schedule/**',
      'infrastructure/**',
    ]);
    expect(pipelineDeploysEveryApiWorkspace(template, API_WORKSPACES)).toEqual([]);
  });

  it('catches a workspace the API bundles that never redeploys it', () => {
    const template = pipelineTriggeredBy(['apps/api/**', 'packages/schedule/**']);
    expect(pipelineDeploysEveryApiWorkspace(template, API_WORKSPACES)).toEqual([
      'Pipeline: a change to packages/contracts (bundled into the API) does not start the pipeline',
    ]);
  });

  it('catches a template with no pipeline trigger at all', () => {
    const template = parseTemplate('Resources:\n  Table:\n    Type: AWS::DynamoDB::Table\n');
    expect(pipelineDeploysEveryApiWorkspace(template, ['apps/api'])).toEqual([
      'No pipeline is started by pushes to the API',
    ]);
  });
});
