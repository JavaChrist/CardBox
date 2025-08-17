#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { src: "", outDir: "public", background: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--src" && args[i + 1]) options.src = args[++i];
    else if (a === "--out" && args[i + 1]) options.outDir = args[++i];
    else if (a === "--bg" && args[i + 1]) options.background = args[++i]; // hex ex: #ffffff
  }
  if (!options.src) {
    console.error(
      "Usage: node scripts/generate-icons.mjs --src <path/to/source.png> [--out public] [--bg #ffffff]"
    );
    process.exit(1);
  }
  return options;
}

function hexToRgba(hex) {
  if (!hex) return null;
  const m = hex.replace("#", "");
  const bigint = parseInt(
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m,
    16
  );
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
    alpha: 1,
  };
}

async function generate() {
  const { src, outDir, background } = parseArgs();
  const srcAbs = path.isAbsolute(src) ? src : path.resolve(projectRoot, src);
  const outAbs = path.isAbsolute(outDir)
    ? outDir
    : path.resolve(projectRoot, outDir);

  if (!fs.existsSync(srcAbs)) {
    console.error(`Source introuvable: ${srcAbs}`);
    process.exit(1);
  }
  if (!fs.existsSync(outAbs)) fs.mkdirSync(outAbs, { recursive: true });

  const bg = hexToRgba(background);
  const resizeOpts = (size) => ({
    width: size,
    height: size,
    fit: "contain",
    background: bg ?? { r: 0, g: 0, b: 0, alpha: 0 },
  });

  const targets = [
    // Favicons onglet
    { name: "logo16.png", size: 16 },
    { name: "logo32.png", size: 32 },
    { name: "logo48.png", size: 48 },
    // PWA courantes
    { name: "logo64.png", size: 64 },
    { name: "logo96.png", size: 96 },
    { name: "logo128.png", size: 128 },
    { name: "logo192.png", size: 192 },
    { name: "logo256.png", size: 256 },
    { name: "logo384.png", size: 384 },
    { name: "logo512.png", size: 512 },
    // iOS Apple Touch
    { name: "apple-touch-icon.png", size: 180 },
    { name: "apple-touch-icon-152.png", size: 152 },
    { name: "apple-touch-icon-167.png", size: 167 },
    { name: "apple-touch-icon-180.png", size: 180 },
  ];

  console.log(`Génération d'icônes depuis: ${srcAbs}`);
  const start = Date.now();

  const srcBase = path.basename(srcAbs).toLowerCase();
  const filteredTargets = targets.filter(
    (t) => t.name.toLowerCase() !== srcBase
  );

  const tasks = filteredTargets.map(async (t) => {
    const outFile = path.join(outAbs, t.name);
    await sharp(srcAbs)
      .resize(resizeOpts(t.size))
      .png({ compressionLevel: 9, quality: 90 })
      .toFile(outFile);
    return outFile;
  });

  const results = await Promise.allSettled(tasks);
  const ok = results.filter((r) => r.status === "fulfilled").length;
  const ko = results.filter((r) => r.status === "rejected");

  console.log(
    `Icônes générées: ${ok}/${filteredTargets.length} en ${
      Date.now() - start
    }ms`
  );
  if (ko.length) {
    console.error(
      "Erreurs:",
      ko.map((e) => e.reason?.message || e.reason)
    );
    process.exit(2);
  }
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
