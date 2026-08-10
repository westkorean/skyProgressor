import type { CoopMember, SkyBlockProfile } from './profileViewModel.ts';

interface UuidResponse {
  id?: string;
  error?: string;
}

interface ProfilesResponse {
  success?: boolean;
  cause?: string;
  profiles?: SkyBlockProfile[] | null;
}

async function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export async function resolveMinecraftUuid(ign: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(`/api/uuid?ign=${encodeURIComponent(ign)}`, { signal });
  const payload = await readJson<UuidResponse>(response);
  if (!response.ok || !payload.id) throw new Error(payload.error ?? 'Unable to resolve username');
  return payload.id;
}

export async function fetchSkyBlockProfiles(uuid: string, signal?: AbortSignal): Promise<SkyBlockProfile[]> {
  const response = await fetch(`/api/profile?uuid=${encodeURIComponent(uuid)}`, { signal });
  const payload = await readJson<ProfilesResponse>(response);
  if (!response.ok || !payload.success) throw new Error(payload.cause ?? 'Failed to fetch profile');
  return payload.profiles ?? [];
}

export async function fetchGardenPayload(profileId: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(`/api/garden?profile=${encodeURIComponent(profileId)}`, { signal });
  if (!response.ok) throw new Error('Garden data is unavailable.');
  return response.json();
}

export async function fetchMemberName(uuid: string, signal?: AbortSignal): Promise<Pick<CoopMember, 'uuid' | 'name'>> {
  try {
    const response = await fetch(`/api/username?uuid=${encodeURIComponent(uuid)}`, { signal });
    const payload = await readJson<{ name?: string }>(response);
    return { uuid, name: response.ok && payload.name ? payload.name : 'Unavailable' };
  } catch {
    return { uuid, name: 'Unavailable' };
  }
}
