export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class SourceError extends Error {
  source: string;
  status: number | undefined;
  constructor(source: string, message: string, status?: number) {
    super(`${source}: ${message}`);
    this.source = source;
    this.status = status;
  }
}

/** JSON fetch with a timeout, and a polite retry on network errors and 429s. */
export async function fetchJson<T>(
  source: string,
  url: string,
  init: RequestInit = {},
  { timeoutMs = 12000, retries = 2 } = {},
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (e) {
      if (attempt >= retries) throw new SourceError(source, `network error (${(e as Error).message})`);
      await sleep(700 * (attempt + 1));
      continue;
    }
    if (res.status === 429 && attempt < retries) {
      const wait = Number(res.headers.get("retry-after")) || 2 * (attempt + 1);
      await sleep(Math.min(wait, 10) * 1000);
      continue;
    }
    if (!res.ok) throw new SourceError(source, `HTTP ${res.status}`, res.status);
    return (await res.json()) as T;
  }
}

/** What every rating adapter returns: one reading on the provider's own scale. */
export interface Reading {
  score: number | null;
  max: number;
  votes: number | null;
  url: string;
}
