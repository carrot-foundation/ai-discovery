import { describe, expect, it } from "vitest";
import { formatGitHubActionsSummary } from "../../src/index-now/index.js";

describe("formatGitHubActionsSummary", () => {
  it("formats success summaries", () => {
    expect(
      formatGitHubActionsSummary({
        ok: true,
        status: 202,
        submittedUrls: ["https://www.carrot.eco/en/blog/a"],
      }),
    ).toContain("Submitted 1 URL");
  });

  it("formats failure summaries without raw response bodies", () => {
    const summary = formatGitHubActionsSummary({
      ok: false,
      status: 500,
      code: "indexnow_http_error",
      message: "IndexNow request failed with status 500",
      submittedUrls: ["https://www.carrot.eco/en/blog/a"],
    });

    expect(summary).toContain("IndexNow submission failed");
    expect(summary).toContain("indexnow_http_error");
  });
});
