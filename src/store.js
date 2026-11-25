// Runs on KaBuM!, Pichau and Terabyte pages. Does something only when the background says this
// tab is the worker tab sitting on the product it is currently adding. Store pages change often:
// if "add to cart" stops working, tune GOOD/BAD below (or add a per-store selector).

const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GOOD = /^(comprar|comprar agora|adicionar ao carrinho|adicionar)\b/;
const BAD = /junto|avise|indisponivel|notifica|comparar|desejo|favorit|lista|parcel|frete|cep/;
const SOLD_OUT = /produto indisponivel|esgotado|avise-me quando chegar|avise-me/;

const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

function findButton() {
  const els = document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');
  for (const el of els) {
    const text = norm(el.innerText || el.value || el.getAttribute("aria-label"));
    if (text && text.length < 40 && GOOD.test(text) && !BAD.test(text) && !el.disabled && visible(el)) return el;
  }
  return null;
}

const send = (m) => chrome.runtime.sendMessage(m).catch(() => null);

(async () => {
  // Human verification (Cloudflare etc.): never touched. The user solves it, the page reloads, we resume.
  if (/just a moment|attention required|verifique que voce|captcha/.test(norm(document.title))) return;

  const task = await send({ type: "GET_TASK" });
  if (!task) return;

  const deadline = Date.now() + 20000;
  let button = null;
  while (Date.now() < deadline) {
    button = findButton();
    if (button) break;
    if (SOLD_OUT.test(norm(document.body.innerText))) {
      await send({ type: "DONE", index: task.index, ok: false, note: "out of stock" });
      return;
    }
    await sleep(500);
  }
  if (!button) {
    await send({ type: "DONE", index: task.index, ok: false, note: "add-to-cart button not found" });
    return;
  }

  await send({ type: "ADDING", index: task.index });
  button.click();
  // If the page navigates, the background advances on its own; otherwise confirm here.
  await sleep(3500);
  await send({ type: "DONE", index: task.index, ok: true, note: "clicked add to cart" });
})();
