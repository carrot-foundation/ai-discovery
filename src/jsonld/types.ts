import { createHash } from "node:crypto";
import { z } from "zod";

export const isoDate = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/u,
    "must be ISO-8601",
  );

export const url = z
  .string()
  .url()
  .refine((u) => /^https?:\/\//u.test(u), "must be absolute http(s) URL");

export const language = z
  .string()
  .regex(
    /^[a-z]{2,3}(-[A-Z]{2,4})?$/u,
    'must be a BCP-47 tag like "en" or "pt-BR"',
  );

export const schemaId = (
  siteOrigin: string,
  kind: string,
  payload?: string,
): string => {
  const hash = createHash("sha1")
    .update(`${kind}:${payload ?? ""}`)
    .digest("hex")
    .slice(0, 8);
  return `${siteOrigin.replace(/\/$/u, "")}/#${kind}-${hash}`;
};
