import { listProfileSnapshots, saveProfileSnapshot, type DerivedProfileSnapshot } from '@/lib/userProgressDatabase';

export const runtime = 'nodejs';

const text = (value: unknown, fallback = '') => typeof value === 'string' ? value.slice(0, 120) : fallback;
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

function parseSnapshot(value: unknown): DerivedProfileSnapshot | null {
  const body = record(value);
  const metrics = record(body.metrics);
  const profileKey = text(body.profileKey);
  if (!profileKey) return null;
  return {
    id: typeof body.id === 'string' ? body.id : crypto.randomUUID(),
    profileKey,
    ign: text(body.ign, 'Unknown'),
    profileName: text(body.profileName, 'Unknown'),
    timestamp: number(body.timestamp) || Date.now(),
    source: 'derived-profile',
    metrics: {
      networth: number(metrics.networth),
      skillAverage: number(metrics.skillAverage),
      skyblockLevel: number(metrics.skyblockLevel),
      magicalPower: number(metrics.magicalPower),
      catacombsLevel: number(metrics.catacombsLevel),
      hotmLevel: number(metrics.hotmLevel),
      hotfLevel: number(metrics.hotfLevel),
      gardenLevel: number(metrics.gardenLevel),
      totalSkillXp: number(metrics.totalSkillXp),
      totalCollections: number(metrics.totalCollections),
    },
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const profileKey = url.searchParams.get('profileKey')?.slice(0, 180);
  if (!profileKey) return Response.json({ error: 'profileKey is required' }, { status: 400 });
  return Response.json(await listProfileSnapshots(profileKey));
}

export async function POST(request: Request) {
  const snapshot = parseSnapshot(await request.json().catch(() => null));
  if (!snapshot) return Response.json({ error: 'Invalid derived snapshot' }, { status: 400 });
  return Response.json(await saveProfileSnapshot(snapshot));
}
