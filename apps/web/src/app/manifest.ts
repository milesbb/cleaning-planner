import type { MetadataRoute } from 'next';
import { iconUrl, MANIFEST_ICONS } from '@/app-icons/app-icons';
import type { AppIcon } from '@/app-icons/app-icons';
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME, ThemeColors } from '@/lib/app-identity';

export const dynamic = 'force-static';

type ManifestIcon = NonNullable<MetadataRoute.Manifest['icons']>[number];

function manifestIcon({ file, sizePixels, purpose }: AppIcon): ManifestIcon {
  return {
    src: iconUrl(file),
    sizes: `${String(sizePixels)}x${String(sizePixels)}`,
    type: 'image/png',
    purpose: purpose === 'maskable' ? 'maskable' : 'any',
  };
}

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: ThemeColors.background,
    theme_color: ThemeColors.brand,
    icons: MANIFEST_ICONS.map(manifestIcon),
  };
}
