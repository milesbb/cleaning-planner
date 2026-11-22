import type { MetadataRoute } from 'next';
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME, ThemeColors } from '@/lib/app-identity';

type ManifestIcon = NonNullable<MetadataRoute.Manifest['icons']>[number];

function pngIcon(path: string, sizePixels: number, purpose: ManifestIcon['purpose']): ManifestIcon {
  return {
    src: path,
    sizes: `${String(sizePixels)}x${String(sizePixels)}`,
    type: 'image/png',
    purpose,
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
    icons: [
      pngIcon('/icons/icon-192.png', 192, 'any'),
      pngIcon('/icons/icon-512.png', 512, 'any'),
      pngIcon('/icons/maskable-512.png', 512, 'maskable'),
    ],
  };
}
