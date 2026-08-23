// Public integrated-reference-demo configuration.
// Public mode always calls the same-origin /api/erir proxy. Local gateway mode
// is opt-in via ?mode=local and is never enabled for the public demo by default.
(() => {
  const query = new URLSearchParams(window.location.search);
  window.ROI_EA_CONFIG = Object.freeze({
    publicDemo: query.get("mode") !== "local",
    localErirApiBase: "http://127.0.0.1:8766",
  });
})();
