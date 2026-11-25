// Generates src/icons/icon-{16,32,48,128}.png (volt-green rounded square with a dark "R"),
// with no dependencies: a tiny supersampled rasterizer + PNG encoder. Run: node scripts/make-icons.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "icons");
const BG = [196, 255, 61];
const FG = [11, 18, 0];

// Shapes in unit coordinates (0..1).
const inRoundRect = (x, y, x0, y0, x1, y1, r) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
const inRect = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
const nearSegment = (x, y, ax, ay, bx, by, w) => {
  const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
  return Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay))) <= w / 2;
};

function letterR(x, y) {
  const stem = inRect(x, y, 0.3, 0.22, 0.43, 0.78);
  const outer = inRect(x, y, 0.3, 0.22, 0.52, 0.56) || inCircle(x, y, 0.52, 0.39, 0.17);
  const inner = inRect(x, y, 0.43, 0.33, 0.52, 0.45) || inCircle(x, y, 0.52, 0.39, 0.06);
  const bowl = outer && !inner && x >= 0.3;
  const leg = nearSegment(x, y, 0.5, 0.54, 0.69, 0.78, 0.13);
  return stem || bowl || leg;
}

function render(size) {
  const ss = 4;
  const px = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let pxl = 0; pxl < size; pxl++) {
      let bg = 0, fg = 0;
      for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
        const x = (pxl + (sx + 0.5) / ss) / size, y = (py + (sy + 0.5) / ss) / size;
        if (!inRoundRect(x, y, 0.02, 0.02, 0.98, 0.98, 0.22)) continue;
        if (letterR(x, y)) fg++; else bg++;
      }
      const n = ss * ss, a = (bg + fg) / n, i = (py * size + pxl) * 4;
      const mix = (c) => (a ? Math.round((BG[c] * bg + FG[c] * fg) / (bg + fg)) : 0);
      px[i] = mix(0); px[i + 1] = mix(1); px[i + 2] = mix(2); px[i + 3] = Math.round(a * 255);
    }
  }
  return png(size, px);
}

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

fs.mkdirSync(OUT, { recursive: true });
for (const s of [16, 32, 48, 128]) {
  fs.writeFileSync(path.join(OUT, `icon-${s}.png`), render(s));
  console.log(`src/icons/icon-${s}.png`);
}
