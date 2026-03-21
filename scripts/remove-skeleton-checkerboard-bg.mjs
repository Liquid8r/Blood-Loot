/**
 * Removes baked-in gray/white checkerboard "fake transparency" from skeleton PNGs.
 * Uses edge color clustering + flood fill + hole fill for pixels matching BG colors.
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GRAPHICS = path.join(__dirname, "..", "assets", "graphics");
const FILES = ["Skeleton1.png", "Skeleton2.png", "Skeleton3.png", "Skeleton4.png"];

const QUANT = 10;
function q(v) {
  return Math.round(v / QUANT) * QUANT;
}
function key(r, g, b) {
  return `${q(r)},${q(g)},${q(b)}`;
}
function dist2(a, b) {
  const dr = a[0] - b[0],
    dg = a[1] - b[1],
    db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

function collectEdgeKeys(data, w, h) {
  const counts = new Map();
  const add = (x, y) => {
    const i = (y * w + x) * 4;
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const k = key(r, g, b);
    counts.set(k, (counts.get(k) || 0) + 1);
  };
  for (let x = 0; x < w; x++) {
    add(x, 0);
    add(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    add(0, y);
    add(w - 1, y);
  }
  return counts;
}

function parseKey(k) {
  return k.split(",").map(Number);
}

async function processFile(filename) {
  const inputPath = path.join(GRAPHICS, filename);
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const n = w * h;

  const edgeCounts = collectEdgeKeys(data, w, h);
  const sorted = [...edgeCounts.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length < 2) {
    console.warn(filename + ": not enough edge colors");
    return;
  }

  const bg0 = parseKey(sorted[0][0]);
  const bg1 = parseKey(sorted[1][0]);
  const bgMatch2 = (r, g, b, thr2) => {
    const d = Math.min(dist2([r, g, b], bg0), dist2([r, g, b], bg1));
    return d <= thr2;
  };

  const chroma = (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b);
  /** Walkable for flood: matches BG swatches, low chroma (not blood/bone tint), not too dark (outline). */
  const FLOOD_LUM_MIN = 70;
  const FLOOD_CHROMA_MAX = 42;
  const FLOOD_DIST2 = 55 * 55;

  const isWalkable = (r, g, b) => {
    const lum = (r + g + b) / 3;
    if (lum < FLOOD_LUM_MIN) return false;
    if (chroma(r, g, b) > FLOOD_CHROMA_MAX) return false;
    return bgMatch2(r, g, b, FLOOD_DIST2);
  };

  const transparent = new Uint8Array(n);
  const visited = new Uint8Array(n);
  const qx = new Int32Array(n);
  const qy = new Int32Array(n);
  let qh = 0,
    qt = 0;

  const push = (x, y) => {
    const idx = y * w + x;
    if (visited[idx]) return;
    const i = idx * 4;
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    if (!isWalkable(r, g, b)) return;
    visited[idx] = 1;
    transparent[idx] = 1;
    qx[qt] = x;
    qy[qt] = y;
    qt++;
  };

  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    push(0, y);
    push(w - 1, y);
  }

  while (qh < qt) {
    const x = qx[qh],
      y = qy[qh];
    qh++;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }

  /** Enclosed checker "holes" (e.g. between ribs): still match BG, still low chroma. */
  const HOLE_DIST2 = 48 * 48;
  const HOLE_CHROMA_MAX = 38;
  for (let idx = 0; idx < n; idx++) {
    if (transparent[idx]) continue;
    const i = idx * 4;
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    if (chroma(r, g, b) > HOLE_CHROMA_MAX) continue;
    if (!bgMatch2(r, g, b, HOLE_DIST2)) continue;
    transparent[idx] = 1;
  }

  const out = Buffer.from(data);
  for (let idx = 0; idx < n; idx++) {
    if (transparent[idx]) out[idx * 4 + 3] = 0;
  }

  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(inputPath);

  console.log("OK:", filename, w + "x" + h, "bg swatches", sorted[0][0], sorted[1][0]);
}

for (const f of FILES) {
  const p = path.join(GRAPHICS, f);
  if (!fs.existsSync(p)) {
    console.warn("skip missing:", f);
    continue;
  }
  await processFile(f);
}
