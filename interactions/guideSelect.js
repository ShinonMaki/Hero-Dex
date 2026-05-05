const fs = require("fs");
const path = require("path");

module.exports = async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;
  if (!interaction.customId.startsWith("guide_select_")) return;

  const file = interaction.values[0];
  const filePath = path.join(__dirname, "..", "guides", file);

  if (!fs.existsSync(filePath)) {
    return interaction.reply({
      content: "Guide file not found.",
      ephemeral: true
    });
  }

  return interaction.reply({
    files: [filePath],
    ephemeral: true
  });
};