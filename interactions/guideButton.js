const { findPdf } = require("../utils/fileUtils");
const { isPremium } = require("../utils/premiumUtils");

async function handleGuideButton(interaction) {
  const hero = interaction.customId.replace("guide_", "");

  try {
    // 🔒 CONTROLLO PREMIUM
    if (!isPremium(interaction.user.id)) {
      return interaction.reply({
        content: "🔒 This guide is premium only.",
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const pdf = findPdf(hero);

    if (!pdf) {
      return interaction.editReply({
        content: "Guide not found."
      });
    }

    return interaction.editReply({
      content: `Guide for ${hero}`,
      files: [`./pdf/${pdf}`]
    });
  } catch (err) {
    console.error("Guide button error:", err);
  }
}

module.exports = {
  handleGuideButton
};
