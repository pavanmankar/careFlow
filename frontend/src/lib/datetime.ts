export function formatUtcMillis(ms: number | string | bigint | null | undefined): string {
  if (ms == null || ms === '') {
    return '';
  }
  const value = typeof ms === 'bigint' ? Number(ms) : Number(ms);
  if (!Number.isFinite(value)) {
    return '';
  }
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
