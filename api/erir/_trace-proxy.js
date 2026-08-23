"use strict";

const MAX_IDS = 12;
const ID_PATTERN = /^[A-Z][A-Z0-9_-]{2,63}$/;
const DEFAULT_ERIR_ORIGIN = "https://erir-readonly-demo-v01-davidcjones45-9546s-projects.vercel.app";

function configuredErirOrigin() {
  const origin = process.env.ERIR_READ_ONLY_API_ORIGIN || DEFAULT_ERIR_ORIGIN;
  let url;
  try { url = new URL(origin); } catch { throw new Error("Configured ERIR read-only API origin is invalid."); }
  if (url.protocol !== "https:") throw new Error("Configured ERIR read-only API origin must use HTTPS.");
  return url.origin;
}

function parseIds(value) {
  if (typeof value !== "string" || !value.trim()) return { error: "Query parameter 'ids' is required." };
  if (value.length > 1024) return { error: "Query parameter 'ids' is too long." };
  const ids = [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))];
  if (!ids.length) return { error: "At least one ERIR identifier is required." };
  if (ids.length > MAX_IDS) return { error: `At most ${MAX_IDS} ERIR identifiers may be requested.` };
  if (ids.some((id) => !ID_PATTERN.test(id))) return { error: "One or more ERIR identifiers are invalid." };
  return { ids };
}

function upstreamTraceUrl(ids) {
  const url = new URL("/api/v1/trace", configuredErirOrigin());
  url.searchParams.set("ids", ids.join(","));
  return url.toString();
}

module.exports = { MAX_IDS, configuredErirOrigin, parseIds, upstreamTraceUrl };
