import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "jsonld/index": "src/jsonld/index.ts",
    "robots/index": "src/robots/index.ts",
    "llms-txt/index": "src/llms-txt/index.ts",
    "md-mirror/index": "src/md-mirror/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
});
