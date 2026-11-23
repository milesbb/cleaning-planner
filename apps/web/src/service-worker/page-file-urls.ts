const LAST_SEGMENT_HAS_EXTENSION = /\.[^/]*$/;

export function pageFileUrls({ url }: { url: URL }): URL[] {
  const { pathname } = url;
  if (pathname.endsWith('/') || LAST_SEGMENT_HAS_EXTENSION.test(pathname)) return [];
  return [new URL(`${pathname}/index.html`, url.origin)];
}
