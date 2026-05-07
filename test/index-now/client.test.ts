import { describe, expect, it } from "vitest";
import {
  normalizeIndexNowUrls,
  submitIndexNowUrls,
} from "../../src/index-now/index.js";

describe("normalizeIndexNowUrls", () => {
  it("keeps only unique HTTPS URLs under the configured host", () => {
    expect(
      normalizeIndexNowUrls(
        [
          "https://www.carrot.eco/en/blog/a#section",
          "https://www.carrot.eco/en/blog/a",
          "http://www.carrot.eco/en/blog/b",
          "https://docs.carrot.eco/docs/a",
          "not a URL",
        ],
        "www.carrot.eco",
      ),
    ).toEqual(["https://www.carrot.eco/en/blog/a"]);
  });
});

describe("submitIndexNowUrls", () => {
  it("submits the expected IndexNow payload", async () => {
    const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
    const result = await submitIndexNowUrls({
      host: "www.carrot.eco",
      key: "test-key",
      keyLocation: "https://www.carrot.eco/test-key.txt",
      urls: [
        "https://www.carrot.eco/en/blog/a",
        "https://www.carrot.eco/en/blog/a",
      ],
      fetch: async (url, init) => {
        requests.push({ url: String(url), init });
        return new Response(null, { status: 202 });
      },
    });

    expect(result).toMatchObject({
      ok: true,
      status: 202,
      submittedUrls: ["https://www.carrot.eco/en/blog/a"],
    });
    expect(requests[0]?.url).toBe("https://api.indexnow.org/IndexNow");
    expect(requests[0]?.init?.method).toBe("POST");
    expect(JSON.parse(String(requests[0]?.init?.body))).toEqual({
      host: "www.carrot.eco",
      key: "test-key",
      keyLocation: "https://www.carrot.eco/test-key.txt",
      urlList: ["https://www.carrot.eco/en/blog/a"],
    });
  });

  it("omits keyLocation when it is not configured", async () => {
    const requests: Array<{ url: string; init: RequestInit | undefined }> = [];

    await submitIndexNowUrls({
      host: "www.carrot.eco",
      key: "test-key",
      urls: ["https://www.carrot.eco/en/blog/a"],
      fetch: async (url, init) => {
        requests.push({ url: String(url), init });
        return new Response(null, { status: 202 });
      },
    });

    expect(requests).toHaveLength(1);
    const request = requests[0];
    if (request === undefined) {
      throw new Error("Expected one IndexNow request");
    }
    if (request.init?.body === undefined) {
      throw new Error("Expected IndexNow request body");
    }

    const payload = JSON.parse(String(request.init.body)) as Record<
      string,
      unknown
    >;
    expect(payload).toEqual({
      host: "www.carrot.eco",
      key: "test-key",
      urlList: ["https://www.carrot.eco/en/blog/a"],
    });
    expect(payload).not.toHaveProperty("keyLocation");
  });

  it("treats 200 as success", async () => {
    const result = await submitIndexNowUrls({
      host: "www.carrot.eco",
      key: "test-key",
      keyLocation: "https://www.carrot.eco/test-key.txt",
      urls: ["https://www.carrot.eco/en/blog/a"],
      fetch: async () => new Response(null, { status: 200 }),
    });

    expect(result.ok).toBe(true);
  });

  it("returns typed failures without raw response bodies", async () => {
    const result = await submitIndexNowUrls({
      host: "www.carrot.eco",
      key: "test-key",
      keyLocation: "https://www.carrot.eco/test-key.txt",
      urls: ["https://www.carrot.eco/en/blog/a"],
      fetch: async () => new Response("raw secret response", { status: 500 }),
    });

    expect(result).toMatchObject({
      ok: false,
      status: 500,
      code: "indexnow_http_error",
      message: "IndexNow request failed with status 500",
    });
    expect(JSON.stringify(result)).not.toContain("raw secret response");
  });
});
