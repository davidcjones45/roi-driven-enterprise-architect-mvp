import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parseIds, upstreamTraceUrl } = require("./api/erir/_trace-proxy.js");
const trace = require("./api/erir/trace.js");

function response() {
  return {
    headers: {}, statusCode: null, body: null,
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    send(body) { this.body = body; return this; },
  };
}

test("same-origin proxy bounds and validates the ERIR trace identifier request", () => {
  assert.deepEqual(parseIds("SRC-FTC-2026-001,CTL-CLAIMS-001").ids, ["SRC-FTC-2026-001", "CTL-CLAIMS-001"]);
  assert.match(parseIds("../../etc").error, /invalid/i);
  assert.match(parseIds(Array.from({ length: 13 }, (_, index) => `CTL-${index + 100}`).join(",")).error, /at most 12/i);
});

test("same-origin proxy uses only its configured ERIR origin", () => {
  const prior = process.env.ERIR_READ_ONLY_API_ORIGIN;
  process.env.ERIR_READ_ONLY_API_ORIGIN = "https://erir.example.vercel.app";
  assert.equal(upstreamTraceUrl(["CTL-CLAIMS-001"]), "https://erir.example.vercel.app/api/v1/trace?ids=CTL-CLAIMS-001");
  if (prior === undefined) delete process.env.ERIR_READ_ONLY_API_ORIGIN;
  else process.env.ERIR_READ_ONLY_API_ORIGIN = prior;
});

test("same-origin proxy relays a read-only ERIR body and blocks writes", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ records: [{ id: "EVD-CLAIMS-001", assessment_result: "not_assessed" }], missing_ids: [] }), { status: 200, headers: { "content-type": "application/json" } });
  const res = response();
  await trace({ method: "GET", query: { ids: "EVD-CLAIMS-001" } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body).records[0], { id: "EVD-CLAIMS-001", assessment_result: "not_assessed" });
  assert.equal(res.headers["cache-control"], "no-store");
  const write = response();
  await trace({ method: "POST", query: { ids: "EVD-CLAIMS-001" } }, write);
  assert.equal(write.statusCode, 405);
  assert.equal(write.headers.allow, "GET");
  globalThis.fetch = originalFetch;
});
