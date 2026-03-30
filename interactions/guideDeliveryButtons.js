const fs = require("fs");
const path = require("path");

const {
  getGuides,
  buildCombinedGuidePdf
} = require("../utils/guideUtils");

const {
  guideViewSessions
} = require("../sessions/guideSessions");

const MAX_FILES_PER_MESSAGE = 10;

async function handleGuideDeliveryButtons(interaction) {
  const session = guideViewSessions.get(interaction.user.id);

  if (!session) {
    return interaction.reply({
      content: "No guide selected.",
      ephemeral: true
    });
  }

  const guides = getGuides();
  const categoryGuides = guides[session.category];

  if (!categoryGuides) {
    guideViewSessions.delete(interaction.user.id);
    return interaction.reply({
      content: "Guide not found.",
      ephemeral: true
    });
  }

  const guideParts = session.guideParts || [session.guideName];

  const partObjects = guideParts
    .map(name => ({
      name,
      data: categoryGuides[name]
    }))
    .filter(part => part.data);

  if (partObjects.length === 0) {
    guideViewSessions.delete(interaction.user.id);
    return interaction.reply({
      content: "Guide not found.",
      ephemeral: true
    });
  }

  // ======================
  // 📱 iOS → PDF UNICO
  // ======================
  if (interaction.customId === "guide_delivery_ios") {
    try {
      await interaction.deferReply({ ephemeral: true });

      const pdfPath = await buildCombinedGuidePdf(
        session.guideName,
        partObjects
      );

      guideViewSessions.delete(interaction.user.id);

      return interaction.editReply({
        content: `📄 ${session.guideName}`,
        files: [pdfPath]
      });

    } catch (err) {
      console.error("PDF merge error:", err);

      return interaction.editReply({
        content: "Error generating PDF."
      });
    }
  }

  // ======================
  // 💻 Android / PC
  // ======================
  if (interaction.customId === "guide_delivery_chat") {
    const combinedText = partObjects
      .map(part => part.data.text || "")
      .join("\n\n");

    const allImages = partObjects.flatMap(part =>
      Array.isArray(part.data.images) ? part.data.images : []
    );

    guideViewSessions.delete(interaction.user.id);

    const chunks = splitText(combinedText || "No text available.", 1900);

    await interaction.reply({
      content: `**${session.guideName}**\n\n${chunks[0]}`,
      ephemeral: true
    });

    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({
        content: chunks[i],
        ephemeral: true
      });
    }

    const imagePaths = allImages
      .map(img => path.join(__dirname, "..", "guides", img))
      .filter(p => fs.existsSync(p));

    const imageChunks = chunkArray(imagePaths, MAX_FILES_PER_MESSAGE);

    for (let i = 0; i < imageChunks.length; i++) {
      await interaction.followUp({
        content: imageChunks.length > 1
          ? `Images ${i + 1}/${imageChunks.length}`
          : undefined,
        files: imageChunks[i],
        ephemeral: true
      });
    }

    return;
  }
}

// ======================
// 🔧 UTILS
// ======================
function splitText(text, maxLength) {
  const chunks = [];

  let remaining = text;

  while (remaining.length > maxLength) {
    let splitIndex = remaining.lastIndexOf("\n", maxLength);

    if (splitIndex === -1) splitIndex = maxLength;

    chunks.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

function chunkArray(array, size) {
  const chunks = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

module.exports = { handleGuideDeliveryButtons };
