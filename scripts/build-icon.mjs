import sharp from "sharp";
import pngToIco from "png-to-ico";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const buildDir = path.join(root, "build");
const publicDir = path.join(root, "public");
const source = path.join(buildDir, "icon-source.png");
const legacySource = path.join(buildDir, "icon.png");

const inputPath = fs.existsSync(source) ? source : legacySource;
if (!fs.existsSync(inputPath)) {
  console.error("Source icon not found. Put the original image at build/icon-source.png");
  process.exit(1);
}

fs.mkdirSync(publicDir, { recursive: true });

const squarePng = path.join(buildDir, "icon-square.png");
const icoPath = path.join(buildDir, "icon.ico");
const publicIcon = path.join(publicDir, "icon.png");
const favicon = path.join(publicDir, "favicon.png");

/** Цвет фона иконки — им заливаем бывшие чёрные углы (JPEG без альфы). */
const PINK = { r: 228, g: 162, b: 164 };
const BLACK_MAX = 28;

function replaceBlackWithPink(rgb, width, height) {
  const out = Buffer.from(rgb);
  for (let i = 0; i < out.length; i += 3) {
    if (out[i] <= BLACK_MAX && out[i + 1] <= BLACK_MAX && out[i + 2] <= BLACK_MAX) {
      out[i] = PINK.r;
      out[i + 1] = PINK.g;
      out[i + 2] = PINK.b;
    }
  }
  return sharp(out, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "eva-icon-"));

async function writePng(filePath, buffer, size) {
  const tmpOut = path.join(tmpDir, path.basename(filePath));
  await sharp(buffer).resize(size, size).png().toFile(tmpOut);
  fs.copyFileSync(tmpOut, filePath);
}

const { data, info } = await sharp(inputPath)
  .resize(1024, 1024, { fit: "cover" })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const master = await replaceBlackWithPink(data, info.width, info.height);

await writePng(path.join(buildDir, "icon.png"), master, 1024);
await writePng(squarePng, master, 256);
await writePng(publicIcon, master, 512);
await writePng(favicon, master, 64);

const icoBuffer = await pngToIco([
  await sharp(master).resize(16, 16).png().toBuffer(),
  await sharp(master).resize(32, 32).png().toBuffer(),
  await sharp(master).resize(48, 48).png().toBuffer(),
  await sharp(master).resize(256, 256).png().toBuffer(),
]);
const tmpIco = path.join(tmpDir, "icon.ico");
fs.writeFileSync(tmpIco, icoBuffer);
fs.copyFileSync(tmpIco, icoPath);

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log("Icons ready (black corners → pink):", icoPath);
