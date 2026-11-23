import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from './manifest';

const PUBLIC_FOLDER = resolve(import.meta.dirname, '../../public');

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

  it('marks the maskable icons as maskable, at the same sizes as the others', () => {
    const maskable = webManifest.icons?.filter((icon) => icon.purpose === 'maskable');
    expect(maskable?.map((icon) => icon.sizes)).toEqual(['192x192', '512x512']);
    expect(maskable?.every((icon) => icon.src.includes('maskable'))).toBe(true);
  });

  it.each(manifest().icons ?? [])('lists $src, which exists', ({ src }) => {
    expect(existsSync(resolve(PUBLIC_FOLDER, `.${src}`))).toBe(true);
  });
});
