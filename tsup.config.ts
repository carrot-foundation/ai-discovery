import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "jsonld/index": "src/jsonld/index.ts",
    "robots/index": "src/robots/index.ts",
    "llms-txt/index": "src/llms-txt/index.ts",
    "md-mirror/index": "src/md-mirror/index.ts",
    "mcp-server/index": "src/mcp-server/index.ts",
    "orama/index": "src/orama/index.ts",
    "index-now/index": "src/index-now/index.ts",
    "glossary/index": "src/glossary/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
});
