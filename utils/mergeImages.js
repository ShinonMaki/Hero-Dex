const sharp = require("sharp");

async function mergeImagesVertically(imagePaths, outputPath) {
  try {
    const resizedImages = [];
    let totalHeight = 0;
    let maxWidth = 0;

    // 🔄 carica e ridimensiona UNA ALLA VOLTA (no overload RAM)
    for (const p of imagePaths) {
      const img = sharp(p);

      const metadata = await img.metadata();

      if (!metadata.width || !metadata.height) continue;

      // 🔥 ridimensionamento (chiave per evitare crash)
      const resized = await img
        .resize({
          width: 800, // puoi modificare (700-1000)
          withoutEnlargement: true
        })
        .toBuffer();

      const resizedMeta = await sharp(resized).metadata();

      totalHeight += resizedMeta.height;
      maxWidth = Math.max(maxWidth, resizedMeta.width);

      resizedImages.push({
        input: resized,
        height: resizedMeta.height
      });
    }

    if (resizedImages.length === 0) {
      throw new Error("No valid images to merge.");
    }

    // ⚠️ protezione anti immagine gigante (Discord limit safety)
    if (totalHeight > 30000) {
      throw new Error("Image too large to generate.");
    }

    let top = 0;

    const composite = resizedImages.map(img => {
      const obj = {
        input: img.input,
        top,
        left: 0
      };
      top += img.height;
      return obj;
    });

    await sharp({
      create: {
        width: maxWidth,
        height: totalHeight,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
      .composite(composite)
      .png({
        quality: 80,
        compressionLevel: 9
      })
      .toFile(outputPath);

  } catch (err) {
    console.error("MergeImages ERROR:", err);
    throw err;
  }
}

module.exports = { mergeImagesVertically };
