// Runs on the RigForge site only (see manifest "matches"). Bridges the page to the extension.
window.addEventListener("message", (e) => {
  if (e.source !== window || e.origin !== location.origin) return;
  const d = e.data;
  if (!d || d.type !== "RIGFORGE_CART" || !Array.isArray(d.jobs)) return;
  chrome.runtime.sendMessage({ type: "START", jobs: d.jobs }, (res) => {
    window.postMessage({ type: "RIGFORGE_ACK", ok: !!(res && res.ok), error: res && res.error }, location.origin);
  });
});
