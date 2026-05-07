import { describe, expect, it } from "vitest";
import type {
  CallToolResult,
  ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";
import {
  READ_ONLY_TOOL_ANNOTATIONS,
  createErrorEnvelope,
  createTextResult,
  registerReadOnlyTool,
} from "../../src/mcp-server/register.js";

interface StubRegisteredTool {
  readonly name: string;
  readonly config: {
    readonly title?: string;
    readonly description?: string;
    readonly annotations?: ToolAnnotations;
  };
  readonly handler: (
    ...args: readonly unknown[]
  ) => CallToolResult | Promise<CallToolResult>;
}

class StubServer {
  registered: StubRegisteredTool | undefined;

  registerTool(
    name: string,
    config: StubRegisteredTool["config"],
    handler: StubRegisteredTool["handler"],
  ): StubRegisteredTool {
    const registered = { name, config, handler };
    this.registered = registered;
    return registered;
  }

  requireRegistered(): StubRegisteredTool {
    if (!this.registered) throw new Error("Expected a registered tool");
    return this.registered;
  }
}

function textPayload(result: CallToolResult): unknown {
  const first = result.content[0];
  if (!first || first.type !== "text") {
    throw new Error("Expected a text result");
  }
  return JSON.parse(first.text);
}

describe("read-only MCP tool registration", () => {
  it("registers tools with read-only annotations", () => {
    const server = new StubServer();

    registerReadOnlyTool(server, {
      name: "search_docs",
      title: "Search docs",
      description: "Search public docs.",
      handler: () => ({ ok: true }),
    });

    expect(server.requireRegistered().config.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
    expect(server.requireRegistered().config.annotations).toEqual(
      READ_ONLY_TOOL_ANNOTATIONS,
    );
  });

  it("wraps tool handler output in a JSON text envelope", async () => {
    const server = new StubServer();

    registerReadOnlyTool(server, {
      name: "search_docs",
      handler: () => ({ results: [{ title: "MassID" }] }),
    });

    const result = await server.requireRegistered().handler();
    expect(textPayload(result)).toEqual({ results: [{ title: "MassID" }] });
  });

  it("turns domain errors into typed error envelopes", async () => {
    const server = new StubServer();
    const error = Object.assign(new Error("Document was not found"), {
      code: "not_found",
      details: { docId: "missing" },
    });

    registerReadOnlyTool(server, {
      name: "get_doc",
      handler: () => {
        throw error;
      },
    });

    const result = await server.requireRegistered().handler();
    expect(result.isError).toBe(true);
    expect(textPayload(result)).toEqual(
      createErrorEnvelope("get_doc", "not_found", "Document was not found", {
        docId: "missing",
      }),
    );
  });

  it("creates plain JSON text results", () => {
    expect(textPayload(createTextResult({ ok: true }))).toEqual({ ok: true });
  });
});
