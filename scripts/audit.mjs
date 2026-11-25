// Security audit for the extension source. Runs in CI on every push and PR.
// It fails if the code starts talking to the network, runs remote code, touches cookies/history,
// or if the manifest asks for any permission or site that isn't listed here. Changing what the
// extension can do therefore always shows up as a visible change to THIS file in the diff.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = process.env.AUDIT_SRC ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

const EXPECTED = {
  permissions: ["offscreen", "storage", "system.cpu", "system.memory", "tabs"],
  host_permissions: ["https://www.kabum.com.br/*", "https://www.pichau.com.br/*", "https://www.terabyteshop.com.br/*"],
  storeScripts: ["https://www.kabum.com.br/*", "https://www.pichau.com.br/*", "https://www.terabyteshop.com.br/*"],
  siteScripts: ["http://127.0.0.1/*", "http://localhost/*", "http://rigforge.localhost/*", "https://rigforge.example.com/*"],
  affiliateHosts: ["awin1.com", "lmdee.link", "lomadee.com", "lomadee.com.br"],
};

// Things the extension must never use.
const FORBIDDEN = [
  [/\bfetch\s*\(/, "network request (fetch)"],
  [/XMLHttpRequest/, "network request (XMLHttpRequest)"],
  [/\bWebSocket\b/, "network connection (WebSocket)"],
  [/sendBeacon/, "network beacon"],
  [/\bEventSource\b/, "server-sent events"],
  [/importScripts|import\s*\(/, "loading code at runtime"],
  [/\beval\s*\(|new\s+Function\s*\(/, "running dynamic code"],
  [/\.innerHTML\s*=|insertAdjacentHTML|document\.write/, "injecting HTML"],
  [/document\.cookie|chrome\.cookies/, "reading cookies"],
  [/chrome\.(history|bookmarks|downloads|webRequest|declarativeNetRequest|identity|management|debugger|scripting)\b/, "sensitive browser API"],
  [/<script[^>]+src=["']https?:/i, "remote script"],
];

const problems = [];
const files = fs.readdirSync(SRC).filter((f) => /\.(js|html)$/.test(f));
for (const f of files) {
  const text = fs.readFileSync(path.join(SRC, f), "utf8");
  text.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*\/\//.test(line)) return; // comments may mention the words
    for (const [re, what] of FORBIDDEN) if (re.test(line)) problems.push(`${f}:${i + 1}: ${what}: ${line.trim()}`);
  });
}

const manifest = JSON.parse(fs.readFileSync(path.join(SRC, "manifest.json"), "utf8"));
const same = (a = [], b = []) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const check = (ok, msg) => { if (!ok) problems.push(`manifest.json: ${msg}`); };

check(manifest.manifest_version === 3, "must be Manifest V3");
check(same(manifest.permissions, EXPECTED.permissions), `permissions changed: ${JSON.stringify(manifest.permissions)}`);
check(same(manifest.host_permissions, EXPECTED.host_permissions), `host_permissions changed: ${JSON.stringify(manifest.host_permissions)}`);
check(!manifest.optional_permissions && !manifest.optional_host_permissions, "optional permissions are not allowed");
check(!manifest.externally_connectable, "externally_connectable is not allowed");
check(!manifest.web_accessible_resources, "web_accessible_resources is not allowed");
check(!manifest.content_security_policy, "a custom content_security_policy is not allowed");
const cs = manifest.content_scripts ?? [];
check(cs.length === 2, "expected exactly 2 content scripts");
check(same(cs.find((c) => c.js?.includes("store.js"))?.matches, EXPECTED.storeScripts), "store.js runs on unexpected sites");
check(same(cs.find((c) => c.js?.includes("site.js"))?.matches, EXPECTED.siteScripts), "site.js runs on unexpected sites");

const bg = fs.readFileSync(path.join(SRC, "background.js"), "utf8");
const aff = bg.match(/AFFILIATE_HOSTS\s*=\s*\[([^\]]*)\]/);
const affHosts = aff ? [...aff[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : null;
if (!affHosts || !same(affHosts, EXPECTED.affiliateHosts)) problems.push(`background.js: AFFILIATE_HOSTS changed: ${JSON.stringify(affHosts)}`);

if (problems.length) {
  console.error(`Audit FAILED (${problems.length}):\n` + problems.map((p) => "  - " + p).join("\n"));
  process.exit(1);
}
console.log(`Audit passed: ${files.length} files, no network/remote-code/cookie/history APIs,`);
console.log(`permissions = ${EXPECTED.permissions.join(", ")}`);
console.log(`runs on: 3 stores + RigForge (${EXPECTED.siteScripts.length} origins); opens only stores + ${EXPECTED.affiliateHosts.length} affiliate domains`);
