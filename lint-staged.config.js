export default {
  "*.{js,ts,mjs,cjs,mts,cts}":
    "eslint --fix --cache --cache-location .cache/eslint/",
  "*.{js,ts,mjs,cjs,mts,cts,json,md,yml,yaml}": [
    "prettier --write --ignore-unknown",
    "cspell --no-must-find-files",
  ],
};
