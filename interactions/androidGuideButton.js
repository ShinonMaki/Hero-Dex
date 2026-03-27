const path = require("path");
const fs = require("fs");

async function handleAndroidGuideButton(interaction) {
  const hero = interaction.customId.replace("android_", "");
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

  try {
    await interaction.reply({
      content: `Sending ${files.length} image(s)...`,
      ephemeral: true
    });

    await interaction.followUp({
      files: imagePaths,
      ephemeral: true
    });
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

module.exports = { handleAndroidGuideButton };
