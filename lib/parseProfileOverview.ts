export interface ProfileEconomy {
  purse: number | null;
  bank: number | null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function parseProfileEconomy(
  member: unknown,
  profile: unknown
): ProfileEconomy {
  const memberRecord = record(member);
  const profileRecord = record(profile);
  const currencies = record(memberRecord?.currencies);
  const banking = record(profileRecord?.banking);

  return {
    purse: finiteNumber(currencies?.coin_purse),
    bank: finiteNumber(banking?.balance),
  };
}
