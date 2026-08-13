import { saveAdvisorInput, type AdvisorInputRecord } from '@/lib/userProgressDatabase';

export const runtime = 'nodejs';

const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, fallback = '') => typeof value === 'string' ? value.slice(0, 2_000) : fallback;

export async function POST(request: Request) {
  const body = record(await request.json().catch(() => null));
  const profileKey = text(body.profileKey);
  const textValue = text(body.text).trim();
  if (!profileKey || !textValue) return Response.json({ error: 'profileKey and text are required' }, { status: 400 });
  const kind = body.kind === 'simulator' ? 'simulator' : 'chat';
  const input: AdvisorInputRecord = {
    id: crypto.randomUUID(),
    profileKey,
    profileLabel: text(body.profileLabel, profileKey),
    timestamp: Date.now(),
    kind,
    text: textValue,
    context: record(body.context),
  };
  return Response.json(await saveAdvisorInput(input));
}
