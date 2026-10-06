// Exponential backoff with full jitter: the wait before retry N is random(0, min(cap, base * 2^N)).
export const backoffMs = (attempt: number, base = 500, cap = 30_000) => Math.random() * Math.min(cap, base * 2 ** attempt);

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Network errors (status 0), 429 and 5xx can succeed later; 4xx (not signed in, bad request) will not. */
export const isTransient = (e: unknown) => {
  const status = e instanceof ApiError ? e.status : 0;
  return status === 0 || status === 429 || status >= 500;
};

export async function withRetry<T>(fn: () => Promise<T>, { retries = 4, base = 500, cap = 8_000 } = {}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= retries || !isTransient(e)) throw e;
      await new Promise((r) => setTimeout(r, backoffMs(attempt, base, cap)));
    }
  }
}
