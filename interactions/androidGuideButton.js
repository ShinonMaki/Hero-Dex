const path = require("path");
const fs = require("fs");

const { isPremium } = require("../utils/premiumUtils");

const MAX_FILES_PER_MESSAGE = 10;

async function handleAndroidGuideButton(interaction) {
  const hero = interaction.customId.replace("android_", "");

  // 🔒 CONTROLLO PREMIUM
  if (!isPremium(interaction.user.id)) {
    return interaction.reply({
      content: "🔒 This guide is premium only.",
      ephemeral: true
    });
  }

  const folder = path.join("./hero-guide-images", hero);

  if (!fs.existsSync(folder)) {
    return interaction.reply({
      content: "No Android/PC images found for this hero.",
      ephemeral: true
    });
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

  const imagePaths = files.map(file => path.join(folder, file));
  const chunks = chunkArray(imagePaths, MAX_FILES_PER_MESSAGE);

  try {
    await interaction.reply({
      content: `Sending ${files.length} image(s) in ${chunks.length} message(s)...`,
      ephemeral: true
    });

    for (let i = 0; i < chunks.length; i++) {
      await interaction.followUp({
        content: chunks.length > 1 ? `Part ${i + 1}/${chunks.length}` : undefined,
        files: chunks[i],
        ephemeral: true
      });
    }
  } catch (err) {
    console.error("Android/PC guide send error:", err);

    if (interaction.replied || interaction.deferred) {
      return interaction.followUp({
        content: "Error sending images.",
        ephemeral: true
      });
    }

    return interaction.reply({
      content: "Error sending images.",
      ephemeral: true
    });
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
