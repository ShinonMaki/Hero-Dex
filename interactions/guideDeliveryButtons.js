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

    const chunks = splitText(text, 1900);

    await interaction.reply({
      content: `**${session.guideName}**\n\n${chunks[0] || "No text available."}`,
      ephemeral: true
    });

    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({
        content: chunks[i],
        ephemeral: true
      });
    }

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

function splitText(text, maxLength) {
  const chunks = [];

  if (!text || text.length <= maxLength) {
    return [text || ""];
  }

  let remaining = text;

  while (remaining.length > maxLength) {
    let splitIndex = remaining.lastIndexOf("\n", maxLength);

    if (splitIndex === -1 || splitIndex < maxLength * 0.5) {
      splitIndex = maxLength;
    }

    chunks.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

module.exports = { handleGuideDeliveryButtons };
