// Generates the app icons (tally-mark design) into ./public. No dependencies.
import fs from "node:fs";
import zlib from "node:zlib";

const BG = [15, 23, 42];       // #0f172a
const BAR = [248, 250, 252];   // #f8fafc
const SLASH = [59, 130, 246];  // #3b82f6

// Shapes in 0..1 space. Content stays inside the middle 50% so the
// icon survives Android's circular/rounded "maskable" cropping.
const W = 0.06;
const bars = [0.32, 0.44, 0.56, 0.68].map((x) => [x, 0.28, x, 0.72]);
const slash = [0.25, 0.66, 0.75, 0.34];

function segDist(px, py, [x1, y1, x2, y2]) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function pixel(u, v) {
  if (segDist(u, v, slash) <= W / 2) return SLASH;
  for (const b of bars) if (segDist(u, v, b) <= W / 2) return BAR;
  return BG;
}

function render(size) {
  const SS = 4;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = pixel((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size);
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const n = SS * SS;
      raw[row + 1 + x * 3] = Math.round(r / n);
      raw[row + 2 + x * 3] = Math.round(g / n);
      raw[row + 3 + x * 3] = Math.round(b / n);
    }
  }
  return raw;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(render(size), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.mkdirSync("public", { recursive: true });
for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180], ["favicon-32.png", 32]]) {
  fs.writeFileSync(`public/${name}`, png(size));
  console.log("wrote public/" + name);
}
