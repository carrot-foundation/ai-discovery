import type {
  CallToolResult,
  ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";

export const READ_ONLY_TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const satisfies ToolAnnotations;

export interface ErrorEnvelope {
  readonly error: {
    readonly toolName: string;
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}

export function createTextResult<TEnvelope>(
  envelope: TEnvelope,
): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(envelope) }],
  };
}

export function createErrorEnvelope(
  toolName: string,
  code: string,
  message: string,
  details?: unknown,
): ErrorEnvelope {
  const error = { toolName, code, message };
  if (details === undefined) return { error };
  return { error: { ...error, details } };
}
