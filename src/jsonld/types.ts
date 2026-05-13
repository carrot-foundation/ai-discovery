import { createHash } from "node:crypto";
import { z } from "zod";

export const isoDate = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/u,
    "must be ISO-8601",
  )
  .refine((value) => {
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})/u.exec(value);
    if (dateMatch === null) return false;

    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    const isSameCalendarDay =
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;

    if (!isSameCalendarDay) return false;
    return !value.includes("T") || Number.isFinite(Date.parse(value));
  }, "must be a valid ISO-8601 date");

export const isoDuration = z
  .string()
  .regex(
    /^PT(?=\d+[HMS])(?:\d+H)?(?:\d+M)?(?:\d+S)?$/u,
    "must be ISO-8601 duration with at least one time component",
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
  const normalizedKind = kind.trim();
  if (normalizedKind.length === 0) {
    throw new Error("kind must be non-empty");
  }

  const hash = createHash("sha1")
    .update(`${normalizedKind}:${payload ?? ""}`)
    .digest("hex")
    .slice(0, 8);
  return `${siteOrigin.replace(/\/$/u, "")}/#${encodeURIComponent(normalizedKind)}-${hash}`;
};
