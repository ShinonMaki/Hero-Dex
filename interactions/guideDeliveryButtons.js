const fs = require("fs");
const path = require("path");
const {
  getGuides
} = require("../utils/guideUtils");

const {
  guideViewSessions
} = require("../sessions/guideSessions");

async function handleGuideDeliveryButtons(interaction) {
  const session = guideViewSessions.get(interaction.user.id);

  if (!session) {
    return interaction.reply({
      content: "No guide selected.",
      ephemeral: true
    });
  }

  const guides = getGuides();
  const guide = guides[session.category]?.[session.guideName];

  if (!guide) {
    guideViewSessions.delete(interaction.user.id);
    return interaction.reply({
      content: "Guide not found.",
      ephemeral: true
    });
  }

  if (interaction.customId === "guide_delivery_ios") {
    const filePath = path.join(__dirname, "..", "guides", guide.file);

    if (!fs.existsSync(filePath)) {
      guideViewSessions.delete(interaction.user.id);
      return interaction.reply({
        content: "Guide file missing.",
        ephemeral: true
      });
    }

    guideViewSessions.delete(interaction.user.id);

    return interaction.reply({
      content: `📄 ${session.guideName}`,
      files: [filePath],
      ephemeral: true
    });
  }

  if (interaction.customId === "guide_delivery_chat") {
    const text = guide.text || "No text available.";
    const images = Array.isArray(guide.images) ? guide.images : [];

    guideViewSessions.delete(interaction.user.id);

    await interaction.reply({
      content: `**${session.guideName}**\n\n${text.slice(0, 4000)}`,
      ephemeral: true
    });

    for (const imageName of images) {
      const imagePath = path.join(__dirname, "..", "guides", imageName);

      if (fs.existsSync(imagePath)) {
        await interaction.followUp({
          files: [imagePath],
          ephemeral: true
        });
      }
    }

    return;
  }
}

module.exports = { handleGuideDeliveryButtons };
