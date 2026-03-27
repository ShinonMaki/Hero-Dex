const sharp = require("sharp");

async function mergeImagesVertically(imagePaths, outputPath) {
  const resizedImages = [];
  let totalHeight = 0;
  let maxWidth = 0;

  for (const p of imagePaths) {
    const img = sharp(p);

    const metadata = await img.metadata();

    // 🔥 ridimensiona (IMPORTANTISSIMO)
    const resized = await img
      .resize({ width: 800 }) // puoi cambiare 800 -> 700/900
      .toBuffer();

    const resizedMeta = await sharp(resized).metadata();

    totalHeight += resizedMeta.height;
    maxWidth = Math.max(maxWidth, resizedMeta.width);

    resizedImages.push({
      input: resized,
      height: resizedMeta.height
    });
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
    .png({ quality: 80 })
    .toFile(outputPath);
}

module.exports = { mergeImagesVertically };
