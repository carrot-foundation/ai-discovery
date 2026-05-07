import type { IndexNowSubmitResult } from "./types.js";

export function formatGitHubActionsSummary(
  result: IndexNowSubmitResult,
): string {
  const count = result.submittedUrls.length;
  const noun = count === 1 ? "URL" : "URLs";

  if (result.ok) {
    return [
      "## IndexNow submission",
      "",
      `Submitted ${count} ${noun}.`,
      `Status: ${result.status}`,
    ].join("\n");
  }

  return [
    "## IndexNow submission failed",
    "",
    `Attempted ${count} ${noun}.`,
    `Status: ${result.status}`,
    `Code: ${result.code}`,
    `Message: ${result.message}`,
  ].join("\n");
}
