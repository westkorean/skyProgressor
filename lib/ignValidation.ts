export const MIN_IGN_LENGTH = 3;
export const MAX_IGN_LENGTH = 16;

export interface IgnValidation {
  normalized: string;
  valid: boolean;
  message: string | null;
}

export function validateIgn(value: string): IgnValidation {
  const normalized = value.trim();
  if (normalized.length > MAX_IGN_LENGTH) return { normalized, valid: false, message: `Length exceeded — Minecraft usernames can contain at most ${MAX_IGN_LENGTH} characters.` };
  if (normalized.length > 0 && !/^[A-Za-z0-9_]+$/.test(normalized)) return { normalized, valid: false, message: 'Use only letters, numbers, and underscores.' };
  if (normalized.length < MIN_IGN_LENGTH) return { normalized, valid: false, message: normalized.length === 0 ? null : `Enter at least ${MIN_IGN_LENGTH} characters.` };
  return { normalized, valid: true, message: null };
}
