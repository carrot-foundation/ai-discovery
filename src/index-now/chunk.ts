export function chunkIndexNowUrls(
  urls: readonly string[],
  maxPerBatch = 10_000,
): string[][] {
  if (!Number.isInteger(maxPerBatch) || maxPerBatch < 1) {
    throw new Error("maxPerBatch must be a positive integer");
  }

  const chunks: string[][] = [];
  for (let index = 0; index < urls.length; index += maxPerBatch) {
    chunks.push(urls.slice(index, index + maxPerBatch));
  }
  return chunks;
}
