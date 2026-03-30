const fs = require("fs");
const path = require("path");
const {
  getGuides
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

  if (!categoryGuides || typeof categoryGuides !== "object") {
    guideViewSessions.delete(interaction.user.id);
    return interaction.reply({
      content: "Guide not found.",
      ephemeral: true
    });
  }

  const guideParts = Array.isArray(session.guideParts) && session.guideParts.length > 0
    ? session.guideParts
    : [session.guideName];

  const partObjects = guideParts
    .map(partName => ({
      name: partName,
      data: categoryGuides[partName]
    }))
    .filter(part => part.data);

  if (partObjects.length === 0) {
    guideViewSessions.delete(interaction.user.id);
    return interaction.reply({
      content: "Guide not found.",
      ephemeral: true
    });
  }

  if (interaction.customId === "guide_delivery_ios") {
    const pdfPaths = partObjects
      .map(part => {
        const fileName = part.data.file;
        if (!fileName) return null;

        const filePath = path.join(__dirname, "..", "guides", fileName);
        return fs.existsSync(filePath) ? filePath : null;
      })
      .filter(Boolean);

    if (pdfPaths.length === 0) {
      guideViewSessions.delete(interaction.user.id);
      return interaction.reply({
        content: "Guide file missing.",
        ephemeral: true
      });
    }

    guideViewSessions.delete(interaction.user.id);

    const chunks = chunkArray(pdfPaths, MAX_FILES_PER_MESSAGE);

    await interaction.reply({
      content: `📄 ${session.guideName}`,
      files: chunks[0],
      ephemeral: true
    });

    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({
        content: chunks.length > 1 ? `PDF Part ${i + 1}/${chunks.length}` : undefined,
        files: chunks[i],
        ephemeral: true
      });
    }

    return;
  }

  if (interaction.customId === "guide_delivery_chat") {
    const combinedText = partObjects
      .map(part => part.data.text || "")
      .filter(Boolean)
      .join("\n\n");

    const allImages = partObjects.flatMap(part =>
      Array.isArray(part.data.images) ? part.data.images : []
    );

    guideViewSessions.delete(interaction.user.id);

    const chunks = splitText(combinedText || "No text available.", 1900);

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

    const imagePaths = allImages
      .map(imageName => path.join(__dirname, "..", "guides", imageName))
      .filter(imagePath => fs.existsSync(imagePath));

    const imageChunks = chunkArray(imagePaths, MAX_FILES_PER_MESSAGE);

    for (let i = 0; i < imageChunks.length; i++) {
      await interaction.followUp({
        content: imageChunks.length > 1 ? `Images ${i + 1}/${imageChunks.length}` : undefined,
        files: imageChunks[i],
        ephemeral: true
      });
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

function chunkArray(array, size) {
  const chunks = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

module.exports = { handleGuideDeliveryButtons };
