import { describe, expect, it } from "vitest";
import {
  sanitizeJsonRpcMethod,
  sanitizeToolName,
} from "../../src/mcp-server/sanitize.js";

describe("MCP telemetry sanitizers", () => {
  it("keeps only allowlisted JSON-RPC methods", () => {
    expect(sanitizeJsonRpcMethod("initialize")).toBe("initialize");
    expect(sanitizeJsonRpcMethod("tools/list")).toBe("tools/list");
    expect(sanitizeJsonRpcMethod("tools/call")).toBe("tools/call");
    expect(sanitizeJsonRpcMethod("notifications/initialized")).toBe(
      "notifications/initialized",
    );
    expect(sanitizeJsonRpcMethod("private/custom")).toBeUndefined();
    expect(sanitizeJsonRpcMethod(42)).toBeUndefined();
  });

  it("keeps only tool names from the caller allowlist", () => {
    expect(sanitizeToolName("search_docs", ["search_docs"] as const)).toBe(
      "search_docs",
    );
    expect(
      sanitizeToolName("raw user value", ["search_docs"] as const),
    ).toBeUndefined();
    expect(
      sanitizeToolName(undefined, ["search_docs"] as const),
    ).toBeUndefined();
  });
});
