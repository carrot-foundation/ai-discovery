import { describe, expect, it } from "vitest";
import { chunkIndexNowUrls } from "../../src/index-now/index.js";

describe("chunkIndexNowUrls", () => {
  it("chunks URLs by batch size", () => {
    expect(chunkIndexNowUrls(["a", "b", "c"], 2)).toEqual([["a", "b"], ["c"]]);
  });

  it("rejects invalid batch sizes", () => {
    expect(() => chunkIndexNowUrls(["a"], 0)).toThrow(
      "maxPerBatch must be a positive integer",
    );
  });
});
