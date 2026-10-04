// Turns the background-removed PNGs in assets-cutouts/ into trimmed WebP files for the carousel:
// assets-cutouts/*.png -> public/vehicles/cutouts/*.webp (transparent padding removed, max 1400px wide).
// Inputs are never modified.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC = "assets-cutouts";
const OUT = "public/vehicles/cutouts";
fs.mkdirSync(OUT, { recursive: true });

for (const f of fs.readdirSync(SRC).filter((f) => f.endsWith(".png"))) {
  const out = path.join(OUT, f.replace(/\.png$/, ".webp"));
  const { width, height } = await sharp(path.join(SRC, f))
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 })
    .resize({ width: 1400, withoutEnlargement: true })
    .webp({ quality: 86, alphaQuality: 90 })
    .toFile(out)
    .then((i) => i);
  console.log(f.padEnd(28), `${width}x${height}`, `${(fs.statSync(out).size / 1024) | 0}KB`);
}
