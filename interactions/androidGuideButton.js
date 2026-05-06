const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const MAX_FILES_PER_MESSAGE = 10;
const WATERMARK_PATH = path.join("./watermark", "watermark.PNG"); // cambia in watermark.png se il file è lowercase
const TEMP_DIR = path.join("./temp");

async function handleAndroidGuideButton(interaction) {
  const hero = interaction.customId.replace("android_", "");

  const folder = path.join("./hero-guide-images", hero);

  if (!fs.existsSync(folder)) {
    return interaction.reply({
      content: "No Android/PC images found for this hero.",
      ephemeral: true
    });
  }

  if (!fs.existsSync(WATERMARK_PATH)) {
    return interaction.reply({
      content: "Watermark file not found.",
      ephemeral: true
    });
  }

  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  const files = fs
    .readdirSync(folder)
    .filter(file => /\.(png|jpg|jpeg|webp)$/i.test(file))
    .filter(file => !file.includes("merged"))
    .sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);

      if (isNaN(numA) || isNaN(numB)) {
        return a.localeCompare(b);
      }

      return numA - numB;
    });

  if (files.length === 0) {
    return interaction.reply({
      content: "No images available.",
      ephemeral: true
    });
  }

  try {
    await interaction.reply({
      content: `Preparing ${files.length} protected image(s)...`,
      ephemeral: true
    });

    const watermarkedPaths = [];

    for (const file of files) {
      const inputPath = path.join(folder, file);
      const safeFileName = file.replace(/\s+/g, "_");
      const outputName = `${hero}_${Date.now()}_${safeFileName}`;
      const outputPath = path.join(TEMP_DIR, outputName);

      await applyWatermark(inputPath, outputPath);

      watermarkedPaths.push(outputPath);
    }

    const chunks = chunkArray(watermarkedPaths, MAX_FILES_PER_MESSAGE);

    for (let i = 0; i < chunks.length; i++) {
      await interaction.followUp({
        content: chunks.length > 1 ? `Part ${i + 1}/${chunks.length}` : undefined,
        files: chunks[i],
        ephemeral: true
      });
    }

    setTimeout(() => {
      cleanupFiles(watermarkedPaths);
    }, 60_000);

  } catch (err) {
    console.error("Android/PC guide send error:", err);

    if (interaction.replied || interaction.deferred) {
      return interaction.followUp({
        content: "Error sending protected images.",
        ephemeral: true
      });
    }

    return interaction.reply({
      content: "Error sending protected images.",
      ephemeral: true
    });
  }
}

async function applyWatermark(inputPath, outputPath) {
  const metadata = await sharp(inputPath).metadata();

  const resizedWatermarkBuffer = await sharp(WATERMARK_PATH)
    .resize({
      width: Math.floor(metadata.width * 1.3),
    })
    .png()
    .toBuffer();

  await sharp(inputPath)
    .composite([
      {
        input: resizedWatermarkBuffer,
        gravity: "center",
        blend: "multiply",
        opacity: 0.22
      }
    ])
    .png()
    .toFile(outputPath);
}

function cleanupFiles(files) {
  for (const file of files) {
    fs.unlink(file, () => {});
  }
}

function chunkArray(array, size) {
  const chunks = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

module.exports = { handleAndroidGuideButton };
