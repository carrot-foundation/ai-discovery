import type {
  CallToolResult,
  ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";
import {
  READ_ONLY_TOOL_ANNOTATIONS,
  createErrorEnvelope,
  createTextResult,
} from "./contracts.js";

export {
  READ_ONLY_TOOL_ANNOTATIONS,
  createErrorEnvelope,
  createTextResult,
} from "./contracts.js";

export interface ReadOnlyToolRegistrationConfig {
  title?: string;
  description?: string;
  inputSchema?: unknown;
  annotations?: ToolAnnotations;
}

export type RegisteredReadOnlyTool = unknown;

export interface ReadOnlyToolRegistrar {
  registerTool(
    name: string,
    config: ReadOnlyToolRegistrationConfig,
    handler: (
      ...args: readonly unknown[]
    ) => CallToolResult | Promise<CallToolResult>,
  ): RegisteredReadOnlyTool;
}

export type SafeToolHandler<TInput = undefined, TEnvelope = unknown> = [
  TInput,
] extends [undefined]
  ? () => TEnvelope | Promise<TEnvelope>
  : (input: TInput) => TEnvelope | Promise<TEnvelope>;

export interface SafeToolOptions {
  readonly fallbackErrorCode?: string;
  readonly fallbackErrorMessage?: string;
}

export interface ReadOnlyToolDefinition<
  TInput = undefined,
  TEnvelope = unknown,
> {
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
  readonly inputSchema?: unknown;
  readonly handler: SafeToolHandler<TInput, TEnvelope>;
}

export function safeTool<TInput = undefined, TEnvelope = unknown>(
  toolName: string,
  handler: SafeToolHandler<TInput, TEnvelope>,
  options: SafeToolOptions = {},
): (...args: readonly unknown[]) => Promise<CallToolResult> {
  const fallbackErrorCode = options.fallbackErrorCode ?? "internal_error";
  const fallbackErrorMessage =
    options.fallbackErrorMessage ?? "Tool execution failed";

  return async (...args) => {
    try {
      const input = args.length >= 2 ? args[0] : undefined;
      const executable = handler as (
        input?: unknown,
      ) => TEnvelope | Promise<TEnvelope>;
      const envelope = await executable(input);
      return createTextResult(envelope);
    } catch (error) {
      const code = readStringProperty(error, "code") ?? fallbackErrorCode;
      const message =
        error instanceof Error ? error.message : fallbackErrorMessage;
      const details = readUnknownProperty(error, "details");
      return {
        ...createTextResult(
          createErrorEnvelope(toolName, code, message, details),
        ),
        isError: true,
      };
    }
  };
}

export function registerReadOnlyTool<TInput = undefined, TEnvelope = unknown>(
  server: ReadOnlyToolRegistrar,
  definition: ReadOnlyToolDefinition<TInput, TEnvelope>,
): RegisteredReadOnlyTool {
  const config: ReadOnlyToolRegistrationConfig = {
    annotations: READ_ONLY_TOOL_ANNOTATIONS,
  };

  if (definition.title !== undefined) config.title = definition.title;
  if (definition.description !== undefined) {
    config.description = definition.description;
  }
  if (definition.inputSchema !== undefined) {
    config.inputSchema = definition.inputSchema;
  }

  return server.registerTool(
    definition.name,
    config,
    safeTool(definition.name, definition.handler),
  );
}

function readStringProperty(
  value: unknown,
  property: string,
): string | undefined {
  const propertyValue = readUnknownProperty(value, property);
  return typeof propertyValue === "string" ? propertyValue : undefined;
}

function readUnknownProperty(value: unknown, property: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  if (!Object.hasOwn(value, property)) return undefined;
  return (value as Record<string, unknown>)[property];
}
