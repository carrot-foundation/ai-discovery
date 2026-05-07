import { describe, expect, it } from "vitest";
import { createRateLimiter } from "../../src/mcp-server/rate-limit.js";

describe("createRateLimiter", () => {
  it("limits requests within a time window and resets after the window", () => {
    let now = 1_000;
    const limiter = createRateLimiter({
      maxRequests: 2,
      windowMs: 1_000,
      maxConcurrent: 10,
      now: () => now,
    });

    expect(limiter.acquire("client").allowed).toBe(true);
    expect(limiter.acquire("client").allowed).toBe(true);

    const denied = limiter.acquire("client");
    expect(denied).toMatchObject({
      allowed: false,
      reason: "request-limit",
      retryAfterSeconds: 1,
    });

    now = 2_001;
    expect(limiter.acquire("client").allowed).toBe(true);
  });

  it("limits concurrent requests and release is idempotent", () => {
    const limiter = createRateLimiter({
      maxRequests: 10,
      windowMs: 1_000,
      maxConcurrent: 1,
      now: () => 5_000,
    });

    expect(limiter.acquire("client").allowed).toBe(true);

    const denied = limiter.acquire("client");
    expect(denied).toMatchObject({
      allowed: false,
      reason: "concurrency-limit",
      retryAfterSeconds: 1,
    });

    limiter.release("client");
    limiter.release("client");
    expect(limiter.acquire("client").allowed).toBe(true);
  });

  it("check does not consume a request slot", () => {
    const limiter = createRateLimiter({
      maxRequests: 1,
      windowMs: 1_000,
      now: () => 10_000,
    });

    expect(limiter.check("client").allowed).toBe(true);
    expect(limiter.check("client").allowed).toBe(true);
    expect(limiter.acquire("client").allowed).toBe(true);
    expect(limiter.acquire("client").allowed).toBe(false);
  });
});
