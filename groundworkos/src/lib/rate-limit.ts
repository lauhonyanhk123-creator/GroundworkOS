// Sliding-window rate limiter held in module memory. The production deploy is
// a single Next.js container (Oracle VM behind Nginx), so in-process state is
// sufficient; swap for a shared store if the app is ever scaled horizontally.

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

const windows = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  const timestamps = (windows.get(key) ?? []).filter((t) => t > cutoff);

  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0];
    windows.set(key, timestamps);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  timestamps.push(now);
  windows.set(key, timestamps);

  // Opportunistic cleanup so abandoned sessions do not accumulate forever.
  if (windows.size > 10_000) {
    for (const [k, v] of windows) {
      if (v.every((t) => t <= cutoff)) windows.delete(k);
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimits(): void {
  windows.clear();
}
