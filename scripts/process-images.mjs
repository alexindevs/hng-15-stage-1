// Builds web-ready copies of the vehicle photos: assets-originals/*.jpg -> public/vehicles/*.jpg
// Originals are never modified. Output is a consistent 3:2 frame at 1600x1067.
//
// Per-file framing (keys are file names):
//   extract: { left, top, width, height }  crop in ORIGINAL pixels (keep it 3:2), then scale to the frame
//   blurfill: true                         keep the whole photo and fill the sides with a darkened blur
// Anything not listed uses sharp's automatic "attention" crop.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC = "assets-originals";
const OUT = "public/vehicles";
const W = 1600, H = 1067;

const framing = {
  "sedan-white-mercedes.jpg": { extract: { left: 0, top: 1500, width: 2400, height: 1600 } },
  "suv-white-fortuner.jpg": { extract: { left: 0, top: 1560, width: 2400, height: 1600 } },
  "suv-white-jeep.jpg": { extract: { left: 200, top: 1250, width: 2000, height: 1333 } },
  "moto-bajaj-boxer.jpg": { extract: { left: 600, top: 640, width: 2100, height: 1400 } },
  "moto-green-adventure.jpg": { blurfill: true },
  "bicycle-trek-800.jpg": { blurfill: true },
};

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(SRC).filter((f) => f.endsWith(".jpg"))) {
  const input = path.join(SRC, f);
  const rule = framing[f] ?? {};
  let img;
  if (rule.blurfill) {
    const bg = await sharp(input).rotate().resize(W, H, { fit: "cover" }).blur(30).modulate({ brightness: 0.6 }).toBuffer();
    const fg = await sharp(input).rotate().resize(W, H, { fit: "inside" }).toBuffer();
    img = sharp(bg).composite([{ input: fg, gravity: "centre" }]);
  } else if (rule.extract) {
    img = sharp(input).rotate().extract(rule.extract).resize(W, H, { fit: "cover" });
  } else {
    img = sharp(input).rotate().resize(W, H, { fit: "cover", position: sharp.strategy.attention });
  }
  await img.jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(OUT, f));
  console.log("wrote", path.join(OUT, f));
}
