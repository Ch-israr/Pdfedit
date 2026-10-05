// Decodes the text-safe base64 asset sources (assets/*.png.b64) into real
// PNG files. The GitHub file API used for pushes is text-only, so binary
// assets are stored base64-encoded and decoded at build/dev time.
// Idempotent: safe to run multiple times.
const fs = require("fs");
const path = require("path");

const files = ["icon.png", "adaptive-icon.png", "splash.png", "favicon.png"];
const dir = path.join(__dirname, "..", "assets");

for (const f of files) {
  const src = path.join(dir, f + ".b64");
  const dest = path.join(dir, f);
  if (!fs.existsSync(src)) {
    console.log("skip (no source):", f);
    continue;
  }
  const b64 = fs.readFileSync(src, "utf8").replace(/\s+/g, "");
  fs.writeFileSync(dest, Buffer.from(b64, "base64"));
  console.log("decoded:", f);
}
