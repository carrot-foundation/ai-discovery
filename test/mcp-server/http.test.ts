import { describe, expect, it, vi } from "vitest";
import { createMcpHttpHandler } from "../../src/mcp-server/http.js";
import { createRateLimiter } from "../../src/mcp-server/rate-limit.js";
import type { McpHttpTelemetryEvent } from "../../src/mcp-server/http.js";

interface FakeTransport {
  handleRequest(request: Request): Promise<Response>;
}

function baseOptions(
  overrides: {
    readonly rateLimiter?: ReturnType<typeof createRateLimiter>;
    readonly isTelemetryEnabled?: (requestHost: string) => boolean;
    readonly emitTelemetry?: (event: McpHttpTelemetryEvent) => void;
    readonly transportFactory?: () => FakeTransport;
  } = {},
) {
  return {
    createServer: () => ({
      connect: async (transport: FakeTransport) => {
        void transport;
      },
    }),
    rateLimiter:
      overrides.rateLimiter ??
      createRateLimiter({ maxRequests: 10, windowMs: 1_000 }),
    getRateLimitKey: () => "raw-ip-derived-key",
    toolNameAllowlist: ["search_docs"] as const,
    isTelemetryEnabled: overrides.isTelemetryEnabled ?? (() => false),
    emitTelemetry: overrides.emitTelemetry ?? (() => undefined),
    classifyClientFamily: () => "known-ai-client",
    transportFactory:
      overrides.transportFactory ??
      (() => ({
        handleRequest: async () => Response.json({ ok: true }),
      })),
  };
}

function mcpRequest(body: unknown, method = "POST"): Request {
  const init: RequestInit = {
    method,
    headers: {
      "content-type": "application/json",
      "user-agent": "raw-user-agent",
    },
  };
  if (method !== "GET") init.body = JSON.stringify(body);
  return new Request("https://docs.carrot.eco/mcp", init);
}

function deferredSignal(): {
  readonly promise: Promise<undefined>;
  readonly resolve: () => void;
} {
  let resolveValue: () => void = () => undefined;
  const promise = new Promise<undefined>((resolve) => {
    resolveValue = () => resolve(undefined);
  });
  return { promise, resolve: resolveValue };
}

describe("createMcpHttpHandler", () => {
  it("delegates POST requests to a streamable HTTP transport", async () => {
    const delegated: Request[] = [];
    const handler = createMcpHttpHandler(
      baseOptions({
        transportFactory: () => ({
          handleRequest: async (request) => {
            delegated.push(request);
            return Response.json({ delegated: true }, { status: 201 });
          },
        }),
      }),
    );

    const response = await handler(
      mcpRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    );

    expect(response.status).toBe(201);
    expect(delegated).toHaveLength(1);
    expect(delegated[0]?.method).toBe("POST");
  });

  it("does not implement app-level method blocking in the generic adapter", async () => {
    const delegated: Request[] = [];
    const handler = createMcpHttpHandler(
      baseOptions({
        transportFactory: () => ({
          handleRequest: async (request) => {
            delegated.push(request);
            return new Response(null, { status: 204 });
          },
        }),
      }),
    );

    const response = await handler(mcpRequest(undefined, "GET"));

    expect(response.status).toBe(204);
    expect(delegated[0]?.method).toBe("GET");
  });

  it("returns JSON-RPC 429 responses for request limits", async () => {
    const handler = createMcpHttpHandler(
      baseOptions({
        rateLimiter: createRateLimiter({ maxRequests: 1, windowMs: 1_000 }),
      }),
    );

    await handler(mcpRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }));
    const response = await handler(
      mcpRequest({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("1");
    expect(payload).toMatchObject({
      jsonrpc: "2.0",
      error: {
        code: -32029,
        message: "Too many requests",
        data: { reason: "request-limit", retryAfterSeconds: 1 },
      },
      id: null,
    });
  });

  it("returns JSON-RPC 429 responses for concurrency limits", async () => {
    const firstRequestStarted = deferredSignal();
    const finishFirstRequest = deferredSignal();
    const handler = createMcpHttpHandler(
      baseOptions({
        rateLimiter: createRateLimiter({
          maxRequests: 10,
          windowMs: 1_000,
          maxConcurrent: 1,
        }),
        transportFactory: () => ({
          handleRequest: async () => {
            firstRequestStarted.resolve();
            await finishFirstRequest.promise;
            return Response.json({ ok: true });
          },
        }),
      }),
    );

    const firstResponse = handler(
      mcpRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    );
    await firstRequestStarted.promise;

    const response = await handler(
      mcpRequest({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
    );
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({
      error: {
        data: { reason: "concurrency-limit", retryAfterSeconds: 1 },
      },
    });

    finishFirstRequest.resolve();
    await firstResponse;
  });

  it("does not parse denied request bodies before rate limiting", async () => {
    const handler = createMcpHttpHandler(
      baseOptions({
        rateLimiter: createRateLimiter({ maxRequests: 1, windowMs: 1_000 }),
      }),
    );

    await handler(mcpRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }));
    const deniedRequest = mcpRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });
    const clone = vi.spyOn(deniedRequest, "clone");

    const response = await handler(deniedRequest);

    expect(response.status).toBe(429);
    expect(clone).not.toHaveBeenCalled();
  });

  it("emits only sanitized telemetry fields when enabled", async () => {
    const events: McpHttpTelemetryEvent[] = [];
    const handler = createMcpHttpHandler(
      baseOptions({
        isTelemetryEnabled: (requestHost) => requestHost === "docs.carrot.eco",
        emitTelemetry: (event) => events.push(event),
      }),
    );

    await handler(
      mcpRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "search_docs",
          arguments: { query: "secret prompt" },
        },
      }),
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      method: "tools/call",
      toolName: "search_docs",
      status: 200,
      clientFamily: "known-ai-client",
      rateLimit: { allowed: true },
    });
    expect(JSON.stringify(events[0])).not.toContain("secret prompt");
    expect(JSON.stringify(events[0])).not.toContain("raw-ip-derived-key");
    expect(JSON.stringify(events[0])).not.toContain("raw-user-agent");
  });

  it("drops unknown method and tool names from telemetry", async () => {
    const events: McpHttpTelemetryEvent[] = [];
    const handler = createMcpHttpHandler(
      baseOptions({
        isTelemetryEnabled: () => true,
        emitTelemetry: (event) => events.push(event),
      }),
    );

    await handler(
      mcpRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "private/custom",
        params: { name: "raw tool name" },
      }),
    );

    expect(events).toHaveLength(1);
    const event = events[0];
    if (event === undefined) {
      throw new Error("Expected one telemetry event");
    }
    expect(event).not.toHaveProperty("method");
    expect(event).not.toHaveProperty("toolName");
  });

  it("emits telemetry when the transport throws", async () => {
    const events: McpHttpTelemetryEvent[] = [];
    const handler = createMcpHttpHandler(
      baseOptions({
        isTelemetryEnabled: () => true,
        emitTelemetry: (event) => events.push(event),
        transportFactory: () => ({
          handleRequest: async () => {
            throw new Error("Transport failed");
          },
        }),
      }),
    );

    await expect(
      handler(mcpRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" })),
    ).rejects.toThrow("Transport failed");

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      method: "tools/list",
      status: 500,
      clientFamily: "known-ai-client",
      rateLimit: { allowed: true },
    });
  });

  it("keeps telemetry emission failures best-effort", async () => {
    const handler = createMcpHttpHandler(
      baseOptions({
        isTelemetryEnabled: () => true,
        emitTelemetry: () => {
          throw new Error("Telemetry failed");
        },
      }),
    );

    const response = await handler(
      mcpRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    );

    expect(response.status).toBe(200);
  });

  it("skips telemetry when host gating disables it", async () => {
    const events: McpHttpTelemetryEvent[] = [];
    const handler = createMcpHttpHandler(
      baseOptions({
        isTelemetryEnabled: () => false,
        emitTelemetry: (event) => events.push(event),
      }),
    );

    await handler(mcpRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }));

    expect(events).toHaveLength(0);
  });
});
