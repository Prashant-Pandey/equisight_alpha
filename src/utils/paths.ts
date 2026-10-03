/**
 * Resolves an absolute path with the site's configured base URL.
 * Handles both root deployment (base: '/') and subpath deployment (e.g. GitHub Pages base: '/equisight_alpha').
 */
export function path(subpath: string = '/'): string {
  const rawBase = (import.meta as any).env?.BASE_URL || '/';
  const base = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
  const clean = subpath.startsWith('/') ? subpath : `/${subpath}`;
  if (clean === '/') {
    return base ? `${base}/` : '/';
  }
  return `${base}${clean}`;
}
