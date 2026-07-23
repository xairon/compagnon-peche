// fetch with a timeout, composed with an optional caller AbortSignal, plus a
// short retry on transient failures. Without a timeout, a request that "hangs"
// on a flaky mobile connection (the core field use-case) leaves screens stuck on
// "Chargement…" forever; the timeout aborts it so callers fall back to their
// stale cache / error path. One retry smooths over transient 5xx/network blips
// (Overpass, Sandre WFS and friends 502 fairly often).

const DEFAULT_TIMEOUT = 12000; // ms

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** A single fetch attempt with a timeout, respecting the caller's signal. */
async function once(
  input: RequestInfo | URL,
  signal: AbortSignal | undefined,
  timeout: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort((signal as AbortSignal).reason);
  if (signal) {
    if (signal.aborted) ctrl.abort(signal.reason);
    else signal.addEventListener("abort", onAbort, { once: true });
  }
  const timer = setTimeout(
    () => ctrl.abort(new DOMException("Délai dépassé", "TimeoutError")),
    timeout,
  );
  try {
    return await fetch(input, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

export async function fetchT(
  input: RequestInfo | URL,
  opts: { signal?: AbortSignal; timeout?: number; retries?: number; retryDelay?: number } = {},
): Promise<Response> {
  const { signal, timeout = DEFAULT_TIMEOUT, retries = 1, retryDelay = 400 } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      const res = await once(input, signal, timeout);
      // Retry transient server errors (5xx / 429) — but return the last response
      // as-is once retries are exhausted (callers still see .ok === false).
      if ((res.status >= 500 || res.status === 429) && attempt < retries) {
        await sleep(retryDelay * (attempt + 1));
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (signal?.aborted) throw e; // caller cancelled — don't retry
      // Don't burn another full-length timeout; only retry quick network blips.
      const isTimeout = e instanceof DOMException && e.name === "TimeoutError";
      if (isTimeout || attempt >= retries) throw e;
      await sleep(retryDelay * (attempt + 1));
    }
  }
  throw lastErr;
}
