// Public integrated-reference-demo configuration.
// Set erirApiBase during deployment, or append ?erirApi=https://... for a
// temporary read-only demo endpoint. Local gateway mode is opt-in via
// ?mode=local and is never enabled for the public demo by default.
(() => {
  const query = new URLSearchParams(window.location.search);
  window.ROI_EA_CONFIG = Object.freeze({
    publicDemo: query.get("mode") !== "local",
    erirApiBase: query.get("erirApi") || "",
    localErirApiBase: "http://127.0.0.1:8766",
  });
})();
