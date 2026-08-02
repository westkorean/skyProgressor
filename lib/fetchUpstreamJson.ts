export interface UpstreamJsonResult {
  ok: boolean;
  status: number;
  data: unknown;
}

type NextFetchInit = RequestInit & {
  next?: { revalidate?: number };
};

export async function fetchUpstreamJson(
  url: string,
  init: NextFetchInit = {},
  timeoutMs = 8_000
): Promise<UpstreamJsonResult> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });

  let data: unknown = null;
  try {
    const body = await response.text();
    if (body) data = JSON.parse(body);
  } catch {
    throw new Error('Upstream returned invalid JSON');
  }

  return { ok: response.ok, status: response.status, data };
}
