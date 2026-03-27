const path = require("path");
const fs = require("fs");

const { mergeImagesVertically } = require("../utils/mergeImages");

async function handleAndroidGuideButton(interaction) {
  const hero = interaction.customId.replace("android_", "");

  const folder = path.join("./hero-guide-images", hero);

  if (!fs.existsSync(folder)) {
    return interaction.reply({
      content: "No Android images found for this hero.",
      ephemeral: true
    });
  }

  const files = fs
    .readdirSync(folder)
    .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
    .sort((a, b) => parseInt(a) - parseInt(b));

  if (files.length === 0) {
    return interaction.reply({
      content: "No images available.",
      ephemeral: true
    });
  }

  const imagePaths = files.map(f => path.join(folder, f));

  const outputPath = path.join(folder, `${hero}-merged.png`);

  try {
    await interaction.reply({
      content: "Generating image...",
      ephemeral: true
    });

    await mergeImagesVertically(imagePaths, outputPath);

    await interaction.followUp({
      files: [outputPath]
    });
  } catch (err) {
    console.error(err);
    await interaction.followUp({
      content: "Error generating image.",
      ephemeral: true
    });
  }
}

module.exports = { handleAndroidGuideButton };
