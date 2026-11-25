// Reproducible package build: dist/rigforge-helper-<version>.zip + SHA256SUMS.
// Same source -> byte-identical zip (sorted entries, fixed timestamps, fixed compression),
// so anyone can rebuild a release and compare checksums. No dependencies.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");
const { version } = JSON.parse(fs.readFileSync(path.join(SRC, "manifest.json"), "utf8"));

const walk = (dir, rel = "") =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name), `${rel}${e.name}/`) : [`${rel}${e.name}`]);

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const DOS_TIME = 0, DOS_DATE = (0 << 9) | (1 << 5) | 1; // 1980-01-01 00:00

function zip(entries) {
  const locals = [], centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    // Normalize text line endings so Windows (CRLF) and Linux checkouts build the same bytes.
    const body = /\.(js|json|html)$/.test(name) ? Buffer.from(data.toString("utf8").replace(/\r\n/g, "\n")) : data;
    const deflated = zlib.deflateRawSync(body, { level: 9 });
    const nameBuf = Buffer.from(name);
    const crc = crc32(body);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6); local.writeUInt16LE(8, 8);
    local.writeUInt16LE(DOS_TIME, 10); local.writeUInt16LE(DOS_DATE, 12); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(deflated.length, 18); local.writeUInt32LE(body.length, 22); local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0, 8); central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12); central.writeUInt16LE(DOS_DATE, 14); central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(deflated.length, 20); central.writeUInt32LE(body.length, 24); central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, deflated);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + deflated.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

const files = walk(SRC).sort();
const out = zip(files.map((name) => ({ name, data: fs.readFileSync(path.join(SRC, name)) })));
fs.mkdirSync(DIST, { recursive: true });
const zipName = `rigforge-helper-${version}.zip`;
fs.writeFileSync(path.join(DIST, zipName), out);

const sums = [`${crypto.createHash("sha256").update(out).digest("hex")}  ${zipName}`];
for (const f of files) {
  const raw = fs.readFileSync(path.join(SRC, f));
  const body = /\.(js|json|html)$/.test(f) ? Buffer.from(raw.toString("utf8").replace(/\r\n/g, "\n")) : raw;
  sums.push(`${crypto.createHash("sha256").update(body).digest("hex")}  src/${f}`);
}
fs.writeFileSync(path.join(DIST, "SHA256SUMS"), sums.join("\n") + "\n");
console.log(`dist/${zipName} (${files.length} files, ${out.length} bytes)\n${sums[0]}`);
