const JSON_RPC_METHODS = [
  "initialize",
  "tools/list",
  "tools/call",
  "notifications/initialized",
] as const;

export type SanitizedJsonRpcMethod = (typeof JSON_RPC_METHODS)[number];

export function sanitizeJsonRpcMethod(
  value: unknown,
): SanitizedJsonRpcMethod | undefined {
  if (typeof value !== "string") return undefined;
  return JSON_RPC_METHODS.find((method) => method === value);
}

export function sanitizeToolName<T extends string>(
  value: unknown,
  allowlist: readonly T[],
): T | undefined {
  if (typeof value !== "string") return undefined;
  return allowlist.find((toolName) => toolName === value);
}
