import js from "@eslint/js";
import globals from "globals";
import html from "eslint-plugin-html";

export default [
  { ignores: ["**/node_modules/", "worker/.wrangler/", "dist/", ".certs/", "tools/sop-rig/out/", "peerjs.min.js"] },
  js.configs.recommended,
  {
    // `catch (e) {}` is the house idiom for "storage or the network may be
    // missing, carry on" — it is everywhere on purpose.
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-unused-vars": ["error", { caughtErrors: "none" }],
    },
  },
  {
    files: ["**/*.html"],
    plugins: { html },
    languageOptions: { sourceType: "script", globals: { ...globals.browser, Peer: "readonly" } },
  },
  { files: ["sw.js"], languageOptions: { sourceType: "script", globals: globals.serviceworker } },
  {
    files: ["main.js", "server.js", "certs.js", "tools/*.js", "tools/sop-rig/build.js"],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
  },
  // Injected into the page by the screenshot rig, so it runs in the browser.
  { files: ["tools/sop-rig/shot.js"], languageOptions: { sourceType: "script", globals: globals.browser } },
  {
    files: ["worker/**/*.js", "worker/**/*.mjs"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.serviceworker,
        ...globals.node,
        WebSocketPair: "readonly",
        WebSocketRequestResponsePair: "readonly",
      },
    },
  },
];
