chrome.storage.local.get("lastReport").then(({ lastReport }) => {
  const rows = document.getElementById("rows");
  const carts = document.getElementById("carts");
  if (!lastReport) { rows.textContent = "No report yet."; return; }
  for (const it of lastReport.queue) {
    const tr = document.createElement("tr");
    const status = document.createElement("td");
    status.className = it.status === "added" ? "added" : "failed";
    status.textContent = it.status === "added" ? "Added" : "Needs you";
    const name = document.createElement("td");
    const a = document.createElement("a");
    a.href = it.url; a.target = "_blank"; a.rel = "noopener"; a.textContent = it.title;
    name.append(a);
    if (it.note) { const n = document.createElement("div"); n.className = "muted"; n.textContent = `${it.store}: ${it.note}`; name.append(n); }
    tr.append(status, name);
    rows.append(tr);
  }
  for (const [store, url] of Object.entries(lastReport.carts)) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = url; a.target = "_blank"; a.rel = "noopener"; a.textContent = `${store} cart`;
    li.append(a);
    carts.append(li);
  }
});
