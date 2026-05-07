export const compose = (
  nodes: readonly Record<string, unknown>[],
): Record<string, unknown> => {
  if (nodes.length === 0)
    throw new Error("compose() requires at least one node");
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
};
