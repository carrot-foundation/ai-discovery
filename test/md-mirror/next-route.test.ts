import { describe, expect, it } from "vitest";
import { createMdMirrorRoute } from "../../src/md-mirror/next-route.js";

describe("createMdMirrorRoute", () => {
  it("returns 404 when loader returns null", async () => {
    const handler = createMdMirrorRoute({ load: async () => null });
    const res = await handler(new Request("https://docs.carrot.eco/x.md"), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(404);
  });

  it("returns markdown body with text/markdown content-type", async () => {
    const handler = createMdMirrorRoute({
      load: async () => ({
        markdown: "# Hello\nWorld",
        sourceUrl: "https://docs.carrot.eco/hello",
      }),
    });
    const res = await handler(new Request("https://docs.carrot.eco/hello.md"), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(res.headers.get("x-source-url")).toBe(
      "https://docs.carrot.eco/hello",
    );
    await expect(res.text()).resolves.toBe("# Hello\nWorld");
  });

  it("allows callers to override cache-control", async () => {
    const handler = createMdMirrorRoute({
      cacheControl: "public, max-age=60",
      load: async () => ({
        markdown: "# Hello",
        sourceUrl: "https://docs.carrot.eco/hello",
      }),
    });
    const res = await handler(new Request("https://docs.carrot.eco/hello.md"), {
      params: Promise.resolve({}),
    });
    expect(res.headers.get("cache-control")).toBe("public, max-age=60");
  });
});
