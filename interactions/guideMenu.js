const fs = require("fs");
const path = require("path");
const { getGuides } = require("../utils/guideUtils");

async function handleGuideMenu(interaction) {
  const category = interaction.customId.replace("guide_menu_", "");
  const guideName = interaction.values[0];

  const guides = getGuides();
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

  return interaction.reply({
    content: `📄 ${guideName}`,
    files: [filePath],
    ephemeral: true
  });
}

module.exports = { handleGuideMenu };
