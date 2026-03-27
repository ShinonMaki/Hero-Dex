const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const CACHE_TTL = 10 * 60 * 1000; // 10 min
const MAX_HEIGHT = 4000; // altezza max per immagine (safe Discord)

async function mergeImagesVertically(imagePaths, outputBasePath) {
  try {
    const folder = path.dirname(outputBasePath);
    const baseName = path.basename(outputBasePath, ".png");

    // ===== CACHE CHECK =====
    const existingParts = fs
      .readdirSync(folder)
      .filter(f => f.startsWith(baseName) && f.endsWith(".png"));

    if (existingParts.length > 0) {
      const firstFile = path.join(folder, existingParts[0]);
      const stats = fs.statSync(firstFile);

      if (Date.now() - stats.mtimeMs < CACHE_TTL) {
        return existingParts.map(f => path.join(folder, f));
      }
    }

    // ===== METADATA =====
    const metadata = await Promise.all(
      imagePaths.map(p => sharp(p).metadata())
    );

    const width = Math.max(...metadata.map(m => m.width || 0));

    // ===== RESIZE =====
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

    // ===== SPLIT LOGIC =====
    let parts = [];
    let currentImages = [];
    let currentHeight = 0;

    for (let i = 0; i < resizedImages.length; i++) {
      const imgHeight = resizedMetadata[i].height || 0;

      if (currentHeight + imgHeight > MAX_HEIGHT && currentImages.length > 0) {
        parts.push(currentImages);
        currentImages = [];
        currentHeight = 0;
      }

      currentImages.push({
        buffer: resizedImages[i],
        height: imgHeight
      });

      currentHeight += imgHeight;
    }

    if (currentImages.length > 0) {
      parts.push(currentImages);
    }

    // ===== GENERATE FILES =====
    const outputFiles = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      let top = 0;

      const composite = part.map(img => {
        const obj = {
          input: img.buffer,
          top,
          left: 0
        };
        top += img.height;
        return obj;
      });

      const totalHeight = part.reduce((sum, img) => sum + img.height, 0);

      const outputPath =
        parts.length === 1
          ? outputBasePath
          : path.join(folder, `${baseName}-part${i + 1}.png`);

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

      outputFiles.push(outputPath);
    }

    return outputFiles;

  } catch (err) {
    console.error("Merge+Split error:", err);
    throw err;
  }
}

module.exports = { mergeImagesVertically };
