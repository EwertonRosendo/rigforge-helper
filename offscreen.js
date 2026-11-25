// Hidden offscreen document (Chromium): reads the GPU name through WebGL with a real DOM,
// for service workers that can't create a WebGL context themselves. Ignores every other message.
chrome.runtime.onMessage.addListener((msg, _sender, send) => {
  if (!msg || msg.type !== "OFFSCREEN_GPU") return false;
  let gpu = "";
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || "");
    }
  } catch { /* leave empty */ }
  send({ gpu });
  return false;
});
