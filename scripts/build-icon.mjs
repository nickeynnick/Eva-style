import sharp from "sharp";
import pngToIco from "png-to-ico";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.join(__dirname, "..", "build");
const source = path.join(buildDir, "icon.png");

if (!fs.existsSync(source)) {
  console.error("build/icon.png not found");
  process.exit(1);
}

const squarePng = path.join(buildDir, "icon-square.png");
const icoPath = path.join(buildDir, "icon.ico");

await sharp(source)
  .resize(256, 256, {
    fit: "contain",
    background: { r: 255, g: 240, b: 245, alpha: 1 },
  })
  .png()
  .toFile(squarePng);

const icoBuffer = await pngToIco(squarePng);
fs.writeFileSync(icoPath, icoBuffer);

console.log("Icons ready:", icoPath);
