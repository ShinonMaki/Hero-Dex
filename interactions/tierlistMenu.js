const path = require("path");
const { getTierlistFiles } = require("../utils/fileUtils");
const { formatFileLabel } = require("../utils/formatUtils");

async function handleTierlistMenu(interaction) {
  const selected = interaction.values[0];
  const tierlistFiles = getTierlistFiles();

  const selectedFile = tierlistFiles.find(file => path.parse(file).name === selected);

  try {
    await interaction.deferReply({ ephemeral: true });

    if (!selectedFile) {
      return interaction.editReply({
        content: "Tierlist not found."
      });
    }

    return interaction.editReply({
      content: formatFileLabel(selected),
      files: [`./tierlist/${selectedFile}`]
    });
  } catch (err) {
    console.error("Tierlist menu error:", err);
  }
}

module.exports = {
  handleTierlistMenu
};
