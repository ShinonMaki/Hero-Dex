const { findPdf } = require("../utils/fileUtils");

async function handleGuideButton(interaction) {
  const hero = interaction.customId.replace("guide_", "");

  try {
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
