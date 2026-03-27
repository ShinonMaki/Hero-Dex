const sharp = require("sharp");

async function mergeImagesVertically(imagePaths, outputPath) {
  const images = await Promise.all(
    imagePaths.map(p => sharp(p).toBuffer())
  );

  const metadata = await Promise.all(
    images.map(img => sharp(img).metadata())
  );

  const width = Math.max(...metadata.map(m => m.width));
  const height = metadata.reduce((sum, m) => sum + m.height, 0);

  let top = 0;

  const composite = metadata.map((m, i) => {
    const obj = {
      input: images[i],
      top: top,
      left: 0
    };
    top += m.height;
    return obj;
  });

  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  })
    .composite(composite)
    .png()
    .toFile(outputPath);
}

module.exports = { mergeImagesVertically };
