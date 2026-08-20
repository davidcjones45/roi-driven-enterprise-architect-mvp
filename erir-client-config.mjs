export function runtimeErirConfig(locationLike = globalThis.location) {
  const query = new URLSearchParams(locationLike?.search || "");
  const configured = globalThis.ROI_EA_CONFIG || {};
  return {
    publicDemo: configured.publicDemo ?? query.get("mode") !== "local",
    erirApiBase: configured.erirApiBase || query.get("erirApi") || "",
    localErirApiBase: configured.localErirApiBase || "http://127.0.0.1:8766",
  };
}

export function resolveErirApiBase(regulatory = {}, locationLike = globalThis.location) {
  const config = runtimeErirConfig(locationLike);
  if (config.publicDemo) return "/api/erir";
  return String(regulatory.gatewayUrl || config.localErirApiBase || "").trim().replace(/\/$/, "");
}
