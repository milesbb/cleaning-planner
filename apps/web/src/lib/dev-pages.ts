interface BuildEnvironment {
  NODE_ENV?: string | undefined;
  VERCEL_ENV?: string | undefined;
  INCLUDE_DEV_PAGES?: string | undefined;
}

const PAGE_EXTENSIONS = ['tsx', 'ts'];
const DEV_PAGE_EXTENSION = 'dev.tsx';

export function includesDevPages(environment: BuildEnvironment): boolean {
  if (environment.VERCEL_ENV === 'production') return false;
  if (environment.VERCEL_ENV === 'preview') return true;
  if (environment.INCLUDE_DEV_PAGES === 'true') return true;
  return environment.NODE_ENV !== 'production';
}

export function pageExtensionsFor(environment: BuildEnvironment): string[] {
  return includesDevPages(environment) ? [...PAGE_EXTENSIONS, DEV_PAGE_EXTENSION] : PAGE_EXTENSIONS;
}
