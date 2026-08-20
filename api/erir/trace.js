"use strict";

const { parseIds, upstreamTraceUrl } = require("./_trace-proxy");

function sendJson(response, status, body) {
  response.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  return response.send(JSON.stringify(body));
}

module.exports = async (request, response) => {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return sendJson(response, 405, { error: "Method not allowed. This proxy is read-only." });
  }
  const parsed = parseIds(request.query?.ids);
  if (parsed.error) return sendJson(response, 400, { error: parsed.error });
  try {
    const upstream = await fetch(upstreamTraceUrl(parsed.ids), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    const body = await upstream.text();
    response.status(upstream.status).setHeader("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    return response.send(body);
  } catch (error) {
    return sendJson(response, 502, { error: "Configured ERIR read-only service is unavailable.", detail: error instanceof Error ? error.message : "Unknown proxy error." });
  }
};
