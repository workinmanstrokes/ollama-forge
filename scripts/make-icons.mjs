import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
}

function paint(x, y, size) {
  const nx = (x + 0.5) / size;
  const ny = (y + 0.5) / size;
  const dx = Math.abs(nx - 0.5) / 0.46;
  const dy = Math.abs(ny - 0.5) / 0.46;
  if (dx ** 4 + dy ** 4 > 1) return [0, 0, 0, 0];
  const fx = nx - 0.5;
  const inCore = (fx * fx) / 0.0032 + ((ny - 0.46) ** 2) / 0.018 < 1;
  const inFlame = (fx * fx) / 0.018 + ((ny - 0.4) ** 2) / 0.07 < 1;
  if (inCore) return [255, 220, 150, 255];
  if (inFlame) return [255, 106, 44, 255];
  if (ny > 0.72 && ny < 0.82 && Math.abs(fx) < 0.24) return [231, 196, 162, 255];
  if (ny > 0.8 && ny < 0.88 && Math.abs(fx) < 0.12) return [180, 132, 96, 255];
  const shade = Math.round(22 + (1 - ny) * 10);
  return [shade + 8, shade, shade - 2, 255];
}

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = paint(x, y, size);
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const dir = path.resolve("public/icons");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "icon-192.png"), png(192));
fs.writeFileSync(path.join(dir, "icon-512.png"), png(512));
console.log("wrote public/icons/icon-192.png and icon-512.png");
