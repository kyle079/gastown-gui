export function withRefresh(path: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}refresh=true`;
}
