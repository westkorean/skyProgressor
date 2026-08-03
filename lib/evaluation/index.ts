export * from './types.ts';
export { LocalStorageEvaluationRepository } from './localStorageRepository.ts';

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** Stable, non-identifying profile fingerprint suitable for local evaluation joins. */
export function hashPlayerProfile(value: unknown): string {
  let hash = 0x811c9dc5;
  for (const character of stable(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return `profile-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
