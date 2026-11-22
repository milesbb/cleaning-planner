import { describe, expect, it } from 'vitest';
import manifest from './manifest';

describe('web app manifest', () => {
  const webManifest = manifest();

  it('opens as a standalone app so iOS allows web push', () => {
    expect(webManifest.display).toBe('standalone');
  });

  it('starts on the home screen route', () => {
    expect(webManifest.start_url).toBe('/');
  });

  it('provides 192px and 512px icons for Android install', () => {
    const sizes = webManifest.icons?.map((icon) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
  });

  it('includes a maskable icon', () => {
    expect(webManifest.icons?.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });
});
