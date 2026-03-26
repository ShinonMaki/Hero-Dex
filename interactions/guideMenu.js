const fs = require("fs");
const path = require("path");

const guides = require("../guides.json");

async function handleGuideMenu(interaction) {
  const category = interaction.customId.replace("guide_menu_", "");
  const guideName = interaction.values[0];

  const guide = guides[category]?.[guideName];

  if (!guide) {
    return interaction.reply({
      content: "Guide not found.",
      ephemeral: true
    });
  }

  const filePath = path.join(__dirname, "..", "guides", guide.file);

  if (!fs.existsSync(filePath)) {
    return interaction.reply({
      content: "Guide file missing.",
      ephemeral: true
    });
  }

  await interaction.reply({
    content: `📄 ${guideName}`,
    files: [filePath],
    ephemeral: true
  });
}

module.exports = { handleGuideMenu };
