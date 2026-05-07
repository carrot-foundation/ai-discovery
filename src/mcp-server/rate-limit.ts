export type RateLimitReason = "request-limit" | "concurrency-limit";

export type RateLimitDecision =
  | {
      readonly allowed: true;
      readonly remaining: number;
      readonly resetAt: number;
      readonly retryAfterSeconds: 0;
      readonly active: number;
    }
  | {
      readonly allowed: false;
      readonly reason: RateLimitReason;
      readonly remaining: 0;
      readonly resetAt: number;
      readonly retryAfterSeconds: number;
      readonly active: number;
    };

export interface RateLimiter {
  check(key: string): RateLimitDecision;
  acquire(key: string): RateLimitDecision;
  release(key: string): void;
}

export interface RateLimiterOptions {
  readonly maxRequests: number;
  readonly windowMs: number;
  readonly maxConcurrent?: number;
  readonly now?: () => number;
}

interface RateLimitState {
  count: number;
  resetAt: number;
  active: number;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { maxRequests, windowMs } = options;
  const maxConcurrent = options.maxConcurrent ?? Number.MAX_SAFE_INTEGER;
  const now = options.now ?? Date.now;

  if (!Number.isInteger(maxRequests) || maxRequests < 1) {
    throw new Error("maxRequests must be a positive integer");
  }
  if (!Number.isInteger(windowMs) || windowMs < 1) {
    throw new Error("windowMs must be a positive integer");
  }
  if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1) {
    throw new Error("maxConcurrent must be a positive integer");
  }

  const states = new Map<string, RateLimitState>();
  let nextCleanupAt = 0;

  function cleanupExpiredStates(timestamp: number): void {
    if (timestamp < nextCleanupAt) return;
    nextCleanupAt = timestamp + windowMs;

    for (const [key, state] of states) {
      if (state.active === 0 && timestamp >= state.resetAt) {
        states.delete(key);
      }
    }
  }

  function getState(key: string): RateLimitState {
    const timestamp = now();
    cleanupExpiredStates(timestamp);
    const current = states.get(key);

    if (!current) {
      const created = { count: 0, resetAt: timestamp + windowMs, active: 0 };
      states.set(key, created);
      return created;
    }

    if (timestamp >= current.resetAt) {
      current.count = 0;
      current.resetAt = timestamp + windowMs;
    }

    return current;
  }

  function retryAfterSeconds(resetAt: number): number {
    return Math.max(1, Math.ceil((resetAt - now()) / 1_000));
  }

  function evaluate(key: string): RateLimitDecision {
    const state = getState(key);
    const remaining = Math.max(0, maxRequests - state.count);

    if (state.active >= maxConcurrent) {
      return {
        allowed: false,
        reason: "concurrency-limit",
        remaining: 0,
        resetAt: state.resetAt,
        retryAfterSeconds: 1,
        active: state.active,
      };
    }

    if (remaining < 1) {
      return {
        allowed: false,
        reason: "request-limit",
        remaining: 0,
        resetAt: state.resetAt,
        retryAfterSeconds: retryAfterSeconds(state.resetAt),
        active: state.active,
      };
    }

    return {
      allowed: true,
      remaining,
      resetAt: state.resetAt,
      retryAfterSeconds: 0,
      active: state.active,
    };
  }

  return {
    check(key) {
      return evaluate(key);
    },
    acquire(key) {
      const decision = evaluate(key);
      if (!decision.allowed) return decision;

      const state = getState(key);
      state.count += 1;
      state.active += 1;

      return {
        allowed: true,
        remaining: Math.max(0, maxRequests - state.count),
        resetAt: state.resetAt,
        retryAfterSeconds: 0,
        active: state.active,
      };
    },
    release(key) {
      const state = states.get(key);
      if (!state || state.active < 1) return;
      state.active -= 1;
    },
  };
}
