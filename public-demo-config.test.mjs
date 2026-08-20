import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { erirTraceUrl, resolveErirApiBase, runtimeErirConfig } from "./erir-client-config.mjs";

test("public demo uses the same-origin ERIR proxy rather than a browser CORS configuration", () => {
  globalThis.ROI_EA_CONFIG = { publicDemo: true, erirApiBase: "" };
  assert.equal(resolveErirApiBase({ gatewayUrl: "http://127.0.0.1:8766" }, { search: "" }), "/api/erir");
});

test("public demo does not use a browser-provided ERIR origin", () => {
  globalThis.ROI_EA_CONFIG = { publicDemo: true, erirApiBase: "https://erir-demo.example.vercel.app/" };
  assert.equal(resolveErirApiBase({}, { search: "?erirApi=https://untrusted.example" }), "/api/erir");
});

test("public demo trace uses the exact same-origin proxy path", () => {
  globalThis.ROI_EA_CONFIG = { publicDemo: true };
  assert.equal(erirTraceUrl(["SRC-FTC-2026-001", "EVD-CLAIMS-001"], {}, { search: "" }), "/api/erir/trace?ids=SRC-FTC-2026-001%2CEVD-CLAIMS-001");
});

test("local mode retains the explicit local gateway option", () => {
  globalThis.ROI_EA_CONFIG = { publicDemo: false, erirApiBase: "", localErirApiBase: "http://127.0.0.1:8766" };
  assert.equal(resolveErirApiBase({}, { search: "?mode=local" }), "http://127.0.0.1:8766");
  assert.equal(runtimeErirConfig({ search: "?mode=local" }).publicDemo, false);
});

test("public demo hides and blocks ERIR draft submission while retaining local handoff export", () => {
  const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
  const page = readFileSync(new URL("./index.html", import.meta.url), "utf8");
  assert.match(app, /publicDemo\)\{ toast\('ERIR draft submission is unavailable in the public read-only demo/);
  assert.match(app, /local-erir-draft-panel/);
  assert.match(page, /id="local-erir-draft-panel"/);
  assert.match(page, /download-erir-handoff/);
});
