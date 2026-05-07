import type {
  GlossaryCache,
  GlossaryTermResult,
  MemoryGlossaryCacheOptions,
} from "./types.js";

interface CacheEntry {
  readonly expiresAt: number;
  readonly value: GlossaryTermResult;
}

export function createMemoryGlossaryCache(
  options: MemoryGlossaryCacheOptions,
): GlossaryCache {
  if (!Number.isInteger(options.ttlMs) || options.ttlMs < 1) {
    throw new Error("ttlMs must be a positive integer");
  }

  const now = options.now ?? Date.now;
  const entries = new Map<string, CacheEntry>();

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (now() >= entry.expiresAt) {
        entries.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      entries.set(key, {
        expiresAt: now() + options.ttlMs,
        value,
      });
    },
  };
}

export function normalizeGlossaryCacheKey(
  term: string,
  locale: string,
): string {
  return `${locale.trim().toLowerCase()}:${term.trim().toLowerCase()}`;
}
