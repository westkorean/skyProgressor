import fs from 'fs/promises';
import path from 'path';

export interface DerivedProfileSnapshot {
  id: string;
  profileKey: string;
  ign: string;
  profileName: string;
  timestamp: number;
  source: 'derived-profile';
  metrics: {
    networth: number;
    skillAverage: number;
    skyblockLevel: number;
    magicalPower: number;
    catacombsLevel: number;
    hotmLevel: number;
    hotfLevel: number;
    gardenLevel: number;
    totalSkillXp: number;
    totalCollections: number;
  };
}

export interface AdvisorInputRecord {
  id: string;
  profileKey: string;
  profileLabel: string;
  timestamp: number;
  kind: 'chat' | 'simulator';
  text: string;
  context?: Record<string, unknown>;
}

interface UserProgressDatabase {
  version: 1;
  snapshots: DerivedProfileSnapshot[];
  advisorInputs: AdvisorInputRecord[];
}

const DB_FILE = 'userProgressDatabase.local.json';
const MAX_SNAPSHOTS_PER_PROFILE = 365;
const MAX_ADVISOR_INPUTS = 500;

const dbPath = () => path.join(process.cwd(), 'data', DB_FILE);

async function readDatabase(): Promise<UserProgressDatabase> {
  try {
    const raw = await fs.readFile(dbPath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<UserProgressDatabase>;
    return {
      version: 1,
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots as DerivedProfileSnapshot[] : [],
      advisorInputs: Array.isArray(parsed.advisorInputs) ? parsed.advisorInputs as AdvisorInputRecord[] : [],
    };
  } catch {
    return { version: 1, snapshots: [], advisorInputs: [] };
  }
}

async function writeDatabase(database: UserProgressDatabase) {
  await fs.mkdir(path.dirname(dbPath()), { recursive: true });
  await fs.writeFile(dbPath(), JSON.stringify(database, null, 2), 'utf8');
}

export function networthTopPercent(snapshot: DerivedProfileSnapshot, snapshots: DerivedProfileSnapshot[]): number | null {
  const latestByProfile = new Map<string, DerivedProfileSnapshot>();
  for (const entry of snapshots) {
    const existing = latestByProfile.get(entry.profileKey);
    if (!existing || entry.timestamp > existing.timestamp) latestByProfile.set(entry.profileKey, entry);
  }
  latestByProfile.set(snapshot.profileKey, snapshot);
  const population = [...latestByProfile.values()].filter((entry) => Number.isFinite(entry.metrics.networth) && entry.metrics.networth > 0);
  if (population.length < 2) return null;
  const richerOrEqual = population.filter((entry) => entry.metrics.networth >= snapshot.metrics.networth).length;
  return Math.max(1, Math.min(100, Math.round((richerOrEqual / population.length) * 1000) / 10));
}

export async function listProfileSnapshots(profileKey: string) {
  const database = await readDatabase();
  const snapshots = database.snapshots
    .filter((snapshot) => snapshot.profileKey === profileKey)
    .sort((a, b) => a.timestamp - b.timestamp);
  const latest = snapshots.at(-1) ?? null;
  return { snapshots, networthTopPercent: latest ? networthTopPercent(latest, database.snapshots) : null };
}

export async function saveProfileSnapshot(snapshot: DerivedProfileSnapshot) {
  const database = await readDatabase();
  const currentProfileSnapshots = database.snapshots.filter((entry) => entry.profileKey === snapshot.profileKey);
  const last = currentProfileSnapshots.sort((a, b) => b.timestamp - a.timestamp)[0];
  const shouldReplaceRecent = last && snapshot.timestamp - last.timestamp < 10 * 60 * 1000;
  const snapshots = shouldReplaceRecent
    ? database.snapshots.map((entry) => entry.id === last.id ? { ...snapshot, id: last.id, timestamp: last.timestamp } : entry)
    : [...database.snapshots, snapshot];
  database.snapshots = snapshots
    .sort((a, b) => b.timestamp - a.timestamp)
    .filter((entry, _index, all) => all.filter((candidate) => candidate.profileKey === entry.profileKey && candidate.timestamp >= entry.timestamp).length <= MAX_SNAPSHOTS_PER_PROFILE);
  await writeDatabase(database);
  const profileSnapshots = database.snapshots.filter((entry) => entry.profileKey === snapshot.profileKey).sort((a, b) => a.timestamp - b.timestamp);
  return { snapshots: profileSnapshots, networthTopPercent: networthTopPercent(snapshot, database.snapshots) };
}

export async function saveAdvisorInput(input: AdvisorInputRecord) {
  const database = await readDatabase();
  database.advisorInputs = [input, ...database.advisorInputs].slice(0, MAX_ADVISOR_INPUTS);
  await writeDatabase(database);
  return { saved: true, count: database.advisorInputs.length };
}
