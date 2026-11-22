import type { NextConfig } from 'next';
import { pageExtensionsFor } from './src/lib/dev-pages';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  pageExtensions: pageExtensionsFor(process.env),
  transpilePackages: ['@cleaning-planner/schedule'],
};

export default nextConfig;
