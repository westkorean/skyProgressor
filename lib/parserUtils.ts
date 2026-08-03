export type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

export function asRecordOrEmpty(value: unknown): UnknownRecord {
  return asRecord(value) ?? {};
}

export function nonNegativeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function titleCaseId(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
