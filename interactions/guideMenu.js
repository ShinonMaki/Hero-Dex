const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const {
  getGuides
} = require("../utils/guideUtils");

const {
  guideViewSessions
} = require("../sessions/guideSessions");

async function handleGuideMenu(interaction) {
  const category = interaction.customId.replace("guide_menu_", "");
  const selectedBaseName = interaction.values[0];

  const guides = getGuides();
  const categoryGuides = guides[category];

  if (!categoryGuides || typeof categoryGuides !== "object") {
    return interaction.reply({
      content: "Guide not found.",
      ephemeral: true
    });
  }

  const matchingParts = Object.keys(categoryGuides)
    .filter((guideName) => getBaseGuideName(guideName) === selectedBaseName)
    .sort(sortGuideParts);

  if (matchingParts.length === 0) {
    return interaction.reply({
      content: "Guide not found.",
      ephemeral: true
    });
  }

  guideViewSessions.set(interaction.user.id, {
    category,
    guideName: selectedBaseName,
    guideParts: matchingParts
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("guide_delivery_ios")
      .setLabel("iOS")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("guide_delivery_chat")
      .setLabel("Android/PC")
      .setStyle(ButtonStyle.Success)
  );

  return interaction.reply({
    content: `How do you want to view **${selectedBaseName}**?`,
    components: [row],
    ephemeral: true
  });
}

function getBaseGuideName(guideName) {
  return guideName.replace(/\s+pt\d+$/i, "").trim();
}

function sortGuideParts(a, b) {
  const partA = extractPartNumber(a);
  const partB = extractPartNumber(b);

  if (partA === null && partB === null) {
    return a.localeCompare(b);
  }

  if (partA === null) return -1;
  if (partB === null) return 1;

  return partA - partB;
}

function extractPartNumber(guideName) {
  const match = guideName.match(/\s+pt(\d+)$/i);
  return match ? parseInt(match[1], 10) : null;
}

module.exports = { handleGuideMenu };
