import { describe, expect, it } from 'vitest';
import manifest from './manifest';

describe('web app manifest', () => {
  const result = manifest();

  it('opens as a standalone app so iOS allows web push', () => {
    expect(result.display).toBe('standalone');
  });

  it('starts on the home screen route', () => {
    expect(result.start_url).toBe('/');
  });

  it('provides 192px and 512px icons for Android install', () => {
    const sizes = result.icons?.map((icon) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
  });

  it('includes a maskable icon', () => {
    expect(result.icons?.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });
});
