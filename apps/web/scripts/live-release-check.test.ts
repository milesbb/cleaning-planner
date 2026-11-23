import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { addContentSecurityPolicy } from './content-security-policy';
import { checkLiveRelease } from './live-release-check';
import type { LiveReleaseDependencies, LiveRelease } from './live-release-check';

const SITE = 'https://cleaning.example.test';
const API = 'https://api.example.test';
const PAGE = addContentSecurityPolicy('<html><head></head><body></body></html>', API);
const RELEASE: LiveRelease = {
  repository: 'owner/cleaning-planner',
  siteUrl: SITE,
  releaseCommit: 'release-sha',
  routes: ['/', '/today/'],
  expectedApiCommit: 'release-sha',
};
const STATUSES = `/repos/${RELEASE.repository}/commits/release-sha/statuses`;

interface FakeWorld {
  deploymentStates?: string[];
  pages?: Record<string, { status: number; body: string }>;
  apiVersions?: string[];
}

function fakeDependencies({
  deploymentStates = ['success'],
  pages = {},
  apiVersions = ['release-sha'],
}: FakeWorld = {}): LiveReleaseDependencies & { log: Mock<(line: string) => void> } {
  const states = [...deploymentStates];
  const versions = [...apiVersions];
  return {
    githubJson: (path: string): Promise<unknown> => {
      if (path !== STATUSES) return Promise.reject(new Error(`Unexpected GitHub call ${path}`));
      const state = states.length > 1 ? states.shift() : states[0];
      if (state === 'none') return Promise.resolve([{ context: 'CodeQL', state: 'success' }]);
      return Promise.resolve([
        { context: 'CodeQL', state: 'success' },
        { context: 'Vercel', state },
        { context: 'Vercel', state: 'pending' },
      ]);
    },
    fetchText: (url: string): Promise<{ status: number; body: string }> => {
      if (url === `${API}/v1/health`) {
        const version = versions.length > 1 ? versions.shift() : versions[0];
        return Promise.resolve({ status: 200, body: JSON.stringify({ status: 'ok', version }) });
      }
      const route = url.slice(SITE.length);
      return Promise.resolve(pages[route] ?? { status: 200, body: PAGE });
    },
    wait: (): Promise<void> => Promise.resolve(),
    log: vi.fn<(line: string) => void>(),
  };
}

describe('checkLiveRelease', () => {
  it('passes once the site serves every page with its policy and the API reports the release', async () => {
    const dependencies = fakeDependencies();
    await expect(checkLiveRelease(dependencies, RELEASE)).resolves.toBeUndefined();
    expect(dependencies.log).toHaveBeenCalledWith(`The API reports release-sha`);
  });

  it('waits while Vercel is still deploying the release', async () => {
    const dependencies = fakeDependencies({
      deploymentStates: ['in_progress', 'pending', 'success'],
    });
    await expect(checkLiveRelease(dependencies, RELEASE)).resolves.toBeUndefined();
  });

  it('waits while Vercel has not started on the release', async () => {
    const dependencies = fakeDependencies({ deploymentStates: ['none', 'success'] });
    await expect(checkLiveRelease(dependencies, RELEASE)).resolves.toBeUndefined();
  });

  it('fails when Vercel says the deployment failed', async () => {
    const dependencies = fakeDependencies({ deploymentStates: ['failure'] });
    await expect(checkLiveRelease(dependencies, RELEASE)).rejects.toThrow(
      'Vercel’s production deployment of release-sha failed',
    );
  });

  it('fails when Vercel never finishes', async () => {
    const dependencies = fakeDependencies({ deploymentStates: ['in_progress'] });
    await expect(checkLiveRelease(dependencies, RELEASE)).rejects.toThrow(
      'Vercel’s production deployment of release-sha did not finish',
    );
  });

  it('names every page that is missing or has no policy', async () => {
    const dependencies = fakeDependencies({
      pages: {
        '/today/': { status: 404, body: 'Not found' },
        '/': { status: 200, body: PAGE.replace(/<meta[^>]*\/>/, '') },
      },
    });
    await expect(checkLiveRelease(dependencies, RELEASE)).rejects.toThrow(
      'Live pages are broken: / has no Content-Security-Policy; /today/ answered 404',
    );
  });

  it('waits for the pipeline to put the release on the API', async () => {
    const dependencies = fakeDependencies({
      apiVersions: ['older-sha', 'older-sha', 'release-sha'],
    });
    await expect(checkLiveRelease(dependencies, RELEASE)).resolves.toBeUndefined();
  });

  it('fails when the API still reports another commit after the wait', async () => {
    const dependencies = fakeDependencies({ apiVersions: ['older-sha'] });
    await expect(checkLiveRelease(dependencies, RELEASE)).rejects.toThrow(
      'The API still reports older-sha, not release-sha',
    );
  });
});
