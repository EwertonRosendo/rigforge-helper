// Orchestrates one cart-filling job at a time in a single worker tab.
// State lives in chrome.storage.local because MV3 service workers are stopped and restarted.

const STORE_HOSTS = {
  kabum: ["kabum.com.br"],
  pichau: ["pichau.com.br"],
  terabyte: ["terabyteshop.com.br"],
};

const hostOk = (url, store) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (STORE_HOSTS[store] || []).some((h) => u.hostname === h || u.hostname.endsWith("." + h));
  } catch {
    return false;
  }
};
const httpsOk = (url) => {
  try { return new URL(url).protocol === "https:"; } catch { return false; }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const getJob = async () => (await chrome.storage.local.get("job")).job || null;
const setJob = (job) => chrome.storage.local.set({ job });

async function start(jobs) {
  const queue = [];
  const carts = {};
  for (const j of jobs) {
    if (!STORE_HOSTS[j.store] || !Array.isArray(j.items)) return { ok: false, error: "bad job" };
    if (!hostOk(j.cartUrl, j.store)) return { ok: false, error: "bad cart url" };
    carts[j.store] = j.cartUrl;
    for (const it of j.items) {
      // The product URL must really belong to the store; the tracking URL may go through an affiliate network.
      if (!hostOk(it.url, j.store) || !httpsOk(it.trackUrl)) return { ok: false, error: "bad item url" };
      queue.push({ store: j.store, title: String(it.title).slice(0, 200), url: it.url, trackUrl: it.trackUrl, status: "pending", note: "" });
    }
  }
  if (queue.length === 0) return { ok: false, error: "nothing to add" };
  const tab = await chrome.tabs.create({ url: queue[0].trackUrl, active: true });
  await setJob({ queue, i: 0, tabId: tab.id, carts });
  return { ok: true };
}

async function getTask(tab) {
  const job = await getJob();
  if (!job || !tab || tab.id !== job.tabId) return null;
  const item = job.queue[job.i];
  if (!item || !hostOk(tab.url, item.store)) return null;
  // Same product page (redirects from affiliate links keep the path).
  if (new URL(tab.url).pathname !== new URL(item.url).pathname) return null;
  return { index: job.i, store: item.store };
}

async function markClicked(tabId, index) {
  const job = await getJob();
  if (!job || job.tabId !== tabId || job.i !== index) return;
  job.queue[index].status = "clicked";
  await setJob(job);
}

async function advance(tabId, index, ok, note) {
  const job = await getJob();
  if (!job || job.tabId !== tabId || job.i !== index) return;
  job.queue[index].status = ok ? "added" : "failed";
  job.queue[index].note = note || "";
  job.i += 1;
  if (job.i >= job.queue.length) return finish(job);
  await setJob(job);
  await chrome.tabs.update(tabId, { url: job.queue[job.i].trackUrl });
}

async function finish(job) {
  await chrome.storage.local.set({ lastReport: { at: Date.now(), queue: job.queue, carts: job.carts } });
  await chrome.storage.local.remove("job");
  for (const url of Object.values(job.carts)) await chrome.tabs.create({ url, active: false });
  await chrome.tabs.update(job.tabId, { url: chrome.runtime.getURL("report.html") });
}

chrome.runtime.onMessage.addListener((msg, sender, send) => {
  (async () => {
    if (msg.type === "START") send(await start(msg.jobs));
    else if (msg.type === "GET_TASK") send(await getTask(sender.tab));
    else if (msg.type === "ADDING") { await markClicked(sender.tab.id, msg.index); send({ ok: true }); }
    else if (msg.type === "DONE") { await advance(sender.tab.id, msg.index, msg.ok, msg.note); send({ ok: true }); }
    else send({ ok: false });
  })().catch(() => send({ ok: false }));
  return true; // async response
});

// After "add to cart" most stores navigate to their cart: that is our success signal.
chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  if (info.status !== "complete") return;
  const job = await getJob();
  if (!job || job.tabId !== tabId) return;
  const item = job.queue[job.i];
  if (item && item.status === "clicked") {
    await sleep(1500);
    await advance(tabId, job.i, true, "added (page moved to cart)");
  }
});
