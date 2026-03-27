const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// tempo cache (in ms) → 10 minuti
const CACHE_TTL = 10 * 60 * 1000;

async function mergeImagesVertically(imagePaths, outputPath) {
  try {
    // ===== CACHE CHECK =====
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      const now = Date.now();

      if (now - stats.mtimeMs < CACHE_TTL) {
        // file già valido → non rigenero
        return outputPath;
      }
    }

    // ===== METADATA =====
    const metadata = await Promise.all(
      imagePaths.map(p => sharp(p).metadata())
    );

    // larghezza massima
    const width = Math.max(...metadata.map(m => m.width || 0));

    // ===== RESIZE IMMAGINI =====
    const resizedImages = await Promise.all(
      imagePaths.map(p =>
        sharp(p)
          .resize({
            width,
            fit: "contain",
            background: { r: 255, g: 255, b: 255 }
          })
          .toBuffer()
      )
    );

    const resizedMetadata = await Promise.all(
      resizedImages.map(img => sharp(img).metadata())
    );

    const totalHeight = resizedMetadata.reduce(
      (sum, m) => sum + (m.height || 0),
      0
    );

    // ===== COMPOSITE =====
    let top = 0;

    const composite = resizedImages.map((img, i) => {
      const obj = {
        input: img,
        top: top,
        left: 0
      };

      top += resizedMetadata[i].height || 0;
      return obj;
    });

    // ===== OUTPUT =====
    await sharp({
      create: {
        width,
        height: totalHeight,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
      .composite(composite)
      .png({
        quality: 90,
        compressionLevel: 9
      })
      .toFile(outputPath);

    return outputPath;

  } catch (err) {
    console.error("Merge images error:", err);
    throw err;
  }
}

module.exports = { mergeImagesVertically };
