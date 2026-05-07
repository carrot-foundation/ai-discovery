import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { RateLimiter, RateLimitDecision } from "./rate-limit.js";
import {
  type SanitizedJsonRpcMethod,
  sanitizeJsonRpcMethod,
  sanitizeToolName,
} from "./sanitize.js";

export interface McpHttpTransport {
  handleRequest(request: Request): Promise<Response>;
}

export interface McpHttpServer<TTransport extends McpHttpTransport> {
  connect(transport: TTransport): Promise<void>;
}

export interface McpHttpTelemetryEvent<TToolName extends string = string> {
  method?: SanitizedJsonRpcMethod;
  toolName?: TToolName;
  status: number;
  latencyMs: number;
  clientFamily?: string;
  rateLimit: RateLimitDecision;
}

export interface McpHttpHandlerOptions<
  TToolName extends string,
  TTransport extends McpHttpTransport =
    WebStandardStreamableHTTPServerTransport,
> {
  readonly createServer: () =>
    | McpHttpServer<TTransport>
    | Promise<McpHttpServer<TTransport>>;
  readonly rateLimiter: RateLimiter;
  readonly getRateLimitKey: (request: Request) => string;
  readonly toolNameAllowlist: readonly TToolName[];
  readonly isTelemetryEnabled: (requestHost: string) => boolean;
  readonly emitTelemetry: (
    event: McpHttpTelemetryEvent<TToolName>,
  ) => void | Promise<void>;
  readonly classifyClientFamily: (
    userAgent: string | null,
  ) => string | undefined;
  readonly transportFactory?: () => TTransport;
}

interface TelemetryContext<TToolName extends string> {
  readonly method?: SanitizedJsonRpcMethod;
  readonly toolName?: TToolName;
}

export function createMcpHttpHandler<
  const TToolName extends string,
  TTransport extends McpHttpTransport =
    WebStandardStreamableHTTPServerTransport,
>(
  options: McpHttpHandlerOptions<TToolName, TTransport>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const start = performance.now();
    const context = await parseTelemetryContext(
      request,
      options.toolNameAllowlist,
    );
    const rateKey = options.getRateLimitKey(request);
    const rateLimit = options.rateLimiter.acquire(rateKey);

    if (!rateLimit.allowed) {
      const response = createRateLimitResponse(rateLimit);
      await emitTelemetryIfEnabled(
        options,
        request,
        response,
        start,
        rateLimit,
        context,
      );
      return response;
    }

    try {
      const transport = createTransport(options);
      const server = await options.createServer();
      await server.connect(transport);
      let response: Response;
      try {
        response = await transport.handleRequest(request);
      } catch (error) {
        await emitTelemetryIfEnabled(
          options,
          request,
          new Response(null, { status: 500 }),
          start,
          rateLimit,
          context,
        );
        throw error;
      }
      await emitTelemetryIfEnabled(
        options,
        request,
        response,
        start,
        rateLimit,
        context,
      );
      return response;
    } finally {
      options.rateLimiter.release(rateKey);
    }
  };
}

function createTransport<TTransport extends McpHttpTransport>(
  options: Pick<McpHttpHandlerOptions<string, TTransport>, "transportFactory">,
): TTransport {
  if (options.transportFactory) return options.transportFactory();
  return new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  }) as unknown as TTransport;
}

async function parseTelemetryContext<TToolName extends string>(
  request: Request,
  toolNameAllowlist: readonly TToolName[],
): Promise<TelemetryContext<TToolName>> {
  try {
    const body = (await request.clone().json()) as unknown;
    if (!isRecord(body)) return {};

    const method = sanitizeJsonRpcMethod(body.method);
    const toolName =
      method === "tools/call"
        ? sanitizeToolName(readToolName(body), toolNameAllowlist)
        : undefined;

    const context: {
      method?: SanitizedJsonRpcMethod;
      toolName?: TToolName;
    } = {};
    if (method !== undefined) context.method = method;
    if (toolName !== undefined) context.toolName = toolName;
    return context;
  } catch {
    return {};
  }
}

function readToolName(body: Record<string, unknown>): unknown {
  const params = body.params;
  if (!isRecord(params)) return undefined;
  return params.name;
}

function createRateLimitResponse(
  rateLimit: Extract<RateLimitDecision, { allowed: false }>,
): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32029,
        message: "Too many requests",
        data: {
          reason: rateLimit.reason,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
      },
      id: null,
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(rateLimit.retryAfterSeconds),
      },
    },
  );
}

async function emitTelemetryIfEnabled<TToolName extends string>(
  options: McpHttpHandlerOptions<TToolName, McpHttpTransport>,
  request: Request,
  response: Response,
  start: number,
  rateLimit: RateLimitDecision,
  context: TelemetryContext<TToolName>,
): Promise<void> {
  const requestHost = new URL(request.url).host;
  if (!options.isTelemetryEnabled(requestHost)) return;

  const event: McpHttpTelemetryEvent<TToolName> = {
    status: response.status,
    latencyMs: Math.max(0, performance.now() - start),
    rateLimit,
  };
  if (context.method !== undefined) event.method = context.method;
  if (context.toolName !== undefined) event.toolName = context.toolName;

  const clientFamily = options.classifyClientFamily(
    request.headers.get("user-agent"),
  );
  if (clientFamily !== undefined) event.clientFamily = clientFamily;

  await options.emitTelemetry(event);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
