// Runs on the RigForge site only (see manifest "matches"). Bridges the page to the extension.
// Messages (page -> extension):
//   RIGFORGE_PING            -> RIGFORGE_PONG { version, features }
//   RIGFORGE_DETECT { id }   -> RIGFORGE_DETECT_RESULT { id, ok, cpu, threads, ramBytes }
//   RIGFORGE_CART { jobs }   -> RIGFORGE_ACK { ok }
window.addEventListener("message", (e) => {
  if (e.source !== window || e.origin !== location.origin) return;
  const d = e.data;
  if (!d || typeof d.type !== "string") return;
  const reply = (msg) => window.postMessage(msg, location.origin);

  if (d.type === "RIGFORGE_PING") {
    reply({ type: "RIGFORGE_PONG", version: chrome.runtime.getManifest().version, features: ["cart", "detect"] });
  } else if (d.type === "RIGFORGE_DETECT") {
    chrome.runtime.sendMessage({ type: "DETECT" }, (res) => {
      reply({ type: "RIGFORGE_DETECT_RESULT", id: d.id, ...(res && res.ok ? res : { ok: false }) });
    });
  } else if (d.type === "RIGFORGE_CART" && Array.isArray(d.jobs)) {
    chrome.runtime.sendMessage({ type: "START", jobs: d.jobs }, (res) => {
      reply({ type: "RIGFORGE_ACK", ok: !!(res && res.ok), error: res && res.error });
    });
  }
});
